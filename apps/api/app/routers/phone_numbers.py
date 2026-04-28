"""Phone number search, purchase, and assignment endpoints."""

from __future__ import annotations

from typing import Annotated, Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.config import settings
from app.dependencies import get_current_user_org
from app.services import twilio_service, vapi_service

router = APIRouter(tags=["phone-numbers"])

SUPABASE_URL = settings.next_public_supabase_url
SUPABASE_ANON_KEY = settings.next_public_supabase_anon_key

OrgDep = Annotated[tuple[str, str], Depends(get_current_user_org)]


class AvailablePhoneNumber(BaseModel):
    phone_number: str
    friendly_name: str | None = None
    locality: str | None = None
    region: str | None = None
    country: str
    capabilities: dict[str, bool]
    monthly_cost: float | None = None
    monthly_cost_currency: str | None = None


class PhoneNumberResponse(BaseModel):
    id: str
    org_id: str
    provider_sid: str | None = None
    vapi_phone_number_id: str | None = None
    phone_number: str
    friendly_name: str | None = None
    agent_id: str | None = None
    agent_name: str | None = None
    is_active: bool
    capabilities: dict[str, bool]
    area_code: str | None = None
    country: str
    monthly_cost: float | None = None
    monthly_cost_currency: str | None = None
    provisioning_status: Literal["active", "vapi_error"]
    provisioning_error: str | None = None
    created_at: str
    updated_at: str


class PurchasePhoneNumberRequest(BaseModel):
    phone_number: str
    friendly_name: str | None = None
    agent_id: str | None = None


class AssignPhoneNumberRequest(BaseModel):
    agent_id: str | None = None


def _supabase_headers(access_token: str) -> dict[str, str]:
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }


def _area_code(phone_number: str) -> str | None:
    digits = "".join(ch for ch in phone_number if ch.isdigit())
    if len(digits) == 11 and digits.startswith("1"):
        return digits[1:4]
    if len(digits) == 10:
        return digits[:3]
    return None


def _format_phone_number(row: dict, agent_names: dict[str, str] | None = None) -> dict:
    agent_id = row.get("agent_id")
    return {
        **row,
        "provider_sid": row.get("twilio_sid"),
        "agent_name": agent_names.get(agent_id) if agent_id and agent_names else None,
        "capabilities": row.get("capabilities") or {},
        "country": row.get("country") or "CA",
        "provisioning_status": row.get("provisioning_status") or "active",
    }


async def _ensure_agent_in_org(agent_id: str, org_id: str, headers: dict[str, str]) -> None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/voice_agents",
            params={
                "id": f"eq.{agent_id}",
                "org_id": f"eq.{org_id}",
                "select": "id",
                "limit": "1",
            },
            headers=headers,
            timeout=10.0,
        )
    resp.raise_for_status()
    if not resp.json():
        raise HTTPException(status_code=400, detail="Agent does not belong to this organization")


async def _agent_names_for(rows: list[dict], org_id: str, headers: dict[str, str]) -> dict[str, str]:
    agent_ids = sorted({row["agent_id"] for row in rows if row.get("agent_id")})
    if not agent_ids:
        return {}

    id_filter = ",".join(agent_ids)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/voice_agents",
            params={
                "id": f"in.({id_filter})",
                "org_id": f"eq.{org_id}",
                "select": "id,name",
            },
            headers=headers,
            timeout=10.0,
        )
    resp.raise_for_status()
    return {row["id"]: row["name"] for row in resp.json()}


@router.get("/phone-numbers", response_model=list[PhoneNumberResponse])
async def list_phone_numbers(org: OrgDep) -> list[dict]:
    org_id, access_token = org
    headers = _supabase_headers(access_token)

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/phone_numbers",
                params={
                    "org_id": f"eq.{org_id}",
                    "select": "*",
                    "order": "created_at.desc",
                },
                headers=headers,
                timeout=10.0,
            )
            resp.raise_for_status()
        except httpx.HTTPError:
            if access_token == settings.supabase_service_role_key:
                return []
            raise
    rows = resp.json()
    agent_names = await _agent_names_for(rows, org_id, headers)
    return [_format_phone_number(row, agent_names) for row in rows]


@router.get("/phone-numbers/search", response_model=list[AvailablePhoneNumber])
async def search_phone_numbers(
    org: OrgDep,
    area_code: Annotated[str | None, Query(min_length=3, max_length=3)] = None,
    limit: Annotated[int, Query(ge=1, le=20)] = 10,
) -> list[dict]:
    _org_id, _access_token = org
    if area_code and not area_code.isdigit():
        raise HTTPException(status_code=400, detail="Area code must contain 3 digits")
    if not twilio_service.credentials_configured():
        raise HTTPException(status_code=400, detail="Twilio credentials are not configured")

    try:
        return await twilio_service.search_available_local_numbers(
            area_code=area_code,
            limit=limit,
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Twilio search failed: {exc.response.text}",
        ) from exc


@router.post("/phone-numbers/purchase", response_model=PhoneNumberResponse, status_code=201)
async def purchase_phone_number(body: PurchasePhoneNumberRequest, org: OrgDep) -> dict:
    org_id, access_token = org
    headers = _supabase_headers(access_token)
    if not twilio_service.credentials_configured():
        raise HTTPException(status_code=400, detail="Twilio credentials are not configured")

    if body.agent_id:
        await _ensure_agent_in_org(body.agent_id, org_id, headers)

    try:
        purchased = await twilio_service.purchase_local_number(
            phone_number=body.phone_number,
            friendly_name=body.friendly_name,
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Twilio purchase failed: {exc.response.text}",
        ) from exc

    phone_number = purchased["phone_number"]
    twilio_sid = purchased.get("sid")
    monthly_cost, monthly_cost_currency = await twilio_service.get_local_number_price()

    provisioning_status = "active"
    provisioning_error: str | None = None
    vapi_phone_number_id: str | None = None

    try:
        server_url = f"{settings.public_api_url.rstrip('/')}/api/webhooks/vapi"
        vapi_number = await vapi_service.create_twilio_phone_number(
            number=phone_number,
            name=purchased.get("friendly_name") or phone_number,
            server_url=server_url,
        )
        vapi_phone_number_id = vapi_number.get("id")
    except Exception as exc:
        provisioning_status = "vapi_error"
        provisioning_error = str(exc)

    row = {
        "org_id": org_id,
        "twilio_sid": twilio_sid,
        "vapi_phone_number_id": vapi_phone_number_id,
        "phone_number": phone_number,
        "friendly_name": purchased.get("friendly_name"),
        "agent_id": body.agent_id,
        "is_active": True,
        "capabilities": purchased.get("capabilities") or {},
        "area_code": _area_code(phone_number),
        "country": purchased.get("country") or "CA",
        "monthly_cost": monthly_cost,
        "monthly_cost_currency": monthly_cost_currency,
        "provisioning_status": provisioning_status,
        "provisioning_error": provisioning_error,
    }

    insert_headers = {**headers, "Prefer": "return=representation"}
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/phone_numbers",
            headers=insert_headers,
            json=row,
            timeout=10.0,
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Twilio purchase succeeded, but database insert failed. Manual reconciliation required.",
                "twilio_sid": twilio_sid,
                "phone_number": phone_number,
                "database_error": resp.text,
            },
        )

    created = resp.json()
    if isinstance(created, list):
        created = created[0]

    agent_names = await _agent_names_for([created], org_id, headers)
    return _format_phone_number(created, agent_names)


@router.patch("/phone-numbers/{phone_number_id}/assignment", response_model=PhoneNumberResponse)
async def assign_phone_number(
    phone_number_id: str,
    body: AssignPhoneNumberRequest,
    org: OrgDep,
) -> dict:
    org_id, access_token = org
    headers = _supabase_headers(access_token)

    if body.agent_id:
        await _ensure_agent_in_org(body.agent_id, org_id, headers)

    update_headers = {**headers, "Prefer": "return=representation"}
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/phone_numbers",
            params={"id": f"eq.{phone_number_id}", "org_id": f"eq.{org_id}"},
            headers=update_headers,
            json={"agent_id": body.agent_id},
            timeout=10.0,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to update phone number assignment")

    updated = resp.json()
    if isinstance(updated, list):
        if not updated:
            raise HTTPException(status_code=404, detail="Phone number not found")
        updated = updated[0]

    agent_names = await _agent_names_for([updated], org_id, headers)
    return _format_phone_number(updated, agent_names)
