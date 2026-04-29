"""Vapi server-side webhook handler.

Receives call lifecycle events from Vapi and persists data to Supabase.
Always returns HTTP 200 to Vapi (even on internal errors) to prevent retries.

Event types handled:
- end-of-call-report  : insert call record, update org usage + contact counts
- status-update       : update call status on existing record
- assistant-request   : return Vapi assistant config for the called phone number
- tool-calls          : return mock tool results (e.g. check_availability)
"""

from __future__ import annotations

import logging
from math import ceil
from typing import Annotated

import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.config import settings
from app.dependencies import get_org_from_vapi_call, get_supabase
from app.services import calcom_service, vapi_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["vapi-webhooks"])

SUPABASE_URL = settings.next_public_supabase_url


# ── Security ─────────────────────────────────────────────────


def _verify_secret(x_vapi_secret: str | None) -> None:
    """Reject requests whose x-vapi-secret header doesn't match our config."""
    expected = settings.vapi_webhook_secret
    if expected and x_vapi_secret != expected:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")


# ── Pydantic models ──────────────────────────────────────────


class VapiPhoneNumber(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    number: str | None = None


class VapiCustomer(BaseModel):
    number: str | None = None


class VapiCallMetadata(BaseModel):
    model_config = ConfigDict(extra="allow")
    org_id: str | None = None  # set by web clients when starting a call


class VapiCall(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    call_type: str | None = Field(None, alias="type")  # webCall | inboundPhoneCall | outboundPhoneCall
    assistant_id: str | None = Field(None, alias="assistantId")
    phone_number: VapiPhoneNumber | None = Field(None, alias="phoneNumber")
    customer: VapiCustomer | None = None
    metadata: VapiCallMetadata | None = None
    status: str | None = None
    started_at: str | None = Field(None, alias="startedAt")
    ended_at: str | None = Field(None, alias="endedAt")
    ended_reason: str | None = Field(None, alias="endedReason")
    duration_seconds: float | None = Field(None, alias="durationSeconds")


class VapiTranscriptEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    role: str
    content: str = Field(alias="message")  # Vapi sends "message"; guide stores as "content"


class VapiArtifact(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    messages: list[VapiTranscriptEntry] | None = None  # structured transcript array
    recording_url: str | None = Field(None, alias="recordingUrl")
    summary: str | None = None


class VapiToolCallFunction(BaseModel):
    name: str
    arguments: dict = {}


class VapiToolCall(BaseModel):
    id: str
    function: VapiToolCallFunction


class VapiMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    type: str
    call: VapiCall | None = None
    artifact: VapiArtifact | None = None
    tool_call_list: list[VapiToolCall] | None = Field(None, alias="toolCallList")


class VapiWebhookPayload(BaseModel):
    message: VapiMessage


# ── Helpers ──────────────────────────────────────────────────


def _map_direction(call_type: str | None) -> str:
    """Map Vapi call type to our direction field."""
    if call_type == "webCall":
        return "web"
    if call_type == "outboundPhoneCall":
        return "outbound"
    return "inbound"


# ── Event handlers ───────────────────────────────────────────


async def _handle_end_of_call_report(
    call: VapiCall | None,
    artifact: VapiArtifact | None,
) -> None:
    """Persist completed call data and update org usage + contact counts."""
    if not call:
        return

    headers = get_supabase()
    org_id: str | None = None
    agent_id: str | None = None
    called_number: str | None = None

    # Org resolution: phone call → phone_numbers table; web call → metadata
    if call.phone_number and call.phone_number.number:
        called_number = call.phone_number.number
        async with httpx.AsyncClient() as client:
            pn_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/phone_numbers",
                params={
                    "phone_number": f"eq.{called_number}",
                    "select": "org_id,agent_id",
                    "limit": "1",
                },
                headers=headers,
                timeout=10.0,
            )
        if pn_resp.status_code == 200 and pn_resp.json():
            row = pn_resp.json()[0]
            org_id = row["org_id"]
            agent_id = row["agent_id"]
    elif call.metadata and call.metadata.org_id:
        # Web call: org_id passed by client in metadata
        org_id = call.metadata.org_id

    if not org_id:
        logger.warning("Could not resolve org for vapi_call_id=%s", call.id)
        return

    # Build transcript JSON from structured messages
    transcript_json: list[dict] | None = None
    if artifact and artifact.messages:
        transcript_json = [entry.model_dump() for entry in artifact.messages]

    credits_used = ceil(call.duration_seconds / 60) if call.duration_seconds else 0

    # Upsert call record
    row_data = {
        "org_id": org_id,
        "agent_id": agent_id,
        "vapi_call_id": call.id,
        "direction": _map_direction(call.call_type),
        "status": "completed",
        "from_number": call.customer.number if call.customer else None,
        "to_number": called_number,
        "started_at": call.started_at,
        "ended_at": call.ended_at,
        "duration_seconds": int(call.duration_seconds) if call.duration_seconds else None,
        "ended_reason": call.ended_reason,
        "transcript": transcript_json,
        "summary": artifact.summary if artifact else None,
        "recording_url": artifact.recording_url if artifact else None,
        "credits_used": credits_used,
    }
    upsert_headers = {
        **headers,
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    async with httpx.AsyncClient() as client:
        upsert_resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/calls",
            headers=upsert_headers,
            json=row_data,
            timeout=10.0,
        )
    if upsert_resp.status_code not in (200, 201):
        logger.error("Failed to upsert call: %s", upsert_resp.text)
        return

    # Update org voice_minutes_used and credits_balance
    minutes_used = int(call.duration_seconds / 60) if call.duration_seconds else 0
    async with httpx.AsyncClient() as client:
        org_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/organizations",
            params={"id": f"eq.{org_id}", "select": "voice_minutes_used,credits_balance"},
            headers=headers,
            timeout=10.0,
        )
    if org_resp.status_code == 200 and org_resp.json():
        current = org_resp.json()[0]
        async with httpx.AsyncClient() as client:
            await client.patch(
                f"{SUPABASE_URL}/rest/v1/organizations",
                params={"id": f"eq.{org_id}"},
                headers=headers,
                json={
                    "voice_minutes_used": current["voice_minutes_used"] + minutes_used,
                    "credits_balance": current["credits_balance"] - credits_used,
                },
                timeout=10.0,
            )

    # Update contact total_calls if matching contact exists
    from_number = call.customer.number if call.customer else None
    if from_number:
        async with httpx.AsyncClient() as client:
            contact_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/contacts",
                params={
                    "org_id": f"eq.{org_id}",
                    "phone": f"eq.{from_number}",
                    "select": "id,total_calls",
                    "limit": "1",
                },
                headers=headers,
                timeout=10.0,
            )
        if contact_resp.status_code == 200 and contact_resp.json():
            contact = contact_resp.json()[0]
            async with httpx.AsyncClient() as client:
                await client.patch(
                    f"{SUPABASE_URL}/rest/v1/contacts",
                    params={"id": f"eq.{contact['id']}"},
                    headers=headers,
                    json={
                        "total_calls": contact["total_calls"] + 1,
                        "last_call_at": "now()",
                    },
                    timeout=10.0,
                )


async def _handle_status_update(call: VapiCall | None) -> None:
    """Update call status for an existing call record."""
    if not call or not call.status:
        return

    org_id = await get_org_from_vapi_call(call.id)
    if org_id is None:
        return  # call not yet in DB, skip silently

    headers = get_supabase()
    async with httpx.AsyncClient() as client:
        await client.patch(
            f"{SUPABASE_URL}/rest/v1/calls",
            params={"vapi_call_id": f"eq.{call.id}"},
            headers=headers,
            json={"status": call.status},
            timeout=10.0,
        )


async def _resolve_org_id_for_call(call: VapiCall | None) -> str | None:
    if not call:
        return None

    if call.metadata and call.metadata.org_id:
        return call.metadata.org_id

    org_id = await get_org_from_vapi_call(call.id)
    if org_id:
        return org_id

    called_number = call.phone_number.number if call.phone_number else None
    if not called_number:
        return None

    headers = get_supabase()
    async with httpx.AsyncClient() as client:
        pn_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/phone_numbers",
            params={
                "phone_number": f"eq.{called_number}",
                "select": "org_id",
                "limit": "1",
            },
            headers=headers,
            timeout=10.0,
        )
    if pn_resp.status_code == 200 and pn_resp.json():
        return pn_resp.json()[0].get("org_id")

    return None


async def _get_booking_organization(org_id: str) -> dict | None:
    headers = get_supabase()
    async with httpx.AsyncClient() as client:
        org_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/organizations",
            params={
                "id": f"eq.{org_id}",
                "select": "id,timezone,booking_enabled,calcom_api_key,calcom_event_type_id,calcom_username",
                "limit": "1",
            },
            headers=headers,
            timeout=10.0,
        )
    if org_resp.status_code == 200 and org_resp.json():
        return org_resp.json()[0]

    return None


async def _handle_assistant_request(call: VapiCall | None) -> dict:
    """Return the Vapi assistant config for the called phone number."""
    if not call:
        return {"assistant": {}}

    called_number = call.phone_number.number if call.phone_number else None
    if not called_number:
        return {"assistant": {}}  # web call without phone number

    headers = get_supabase()

    # Look up phone_numbers by our Twilio number
    async with httpx.AsyncClient() as client:
        pn_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/phone_numbers",
            params={
                "phone_number": f"eq.{called_number}",
                "select": "agent_id,org_id",
                "limit": "1",
            },
            headers=headers,
            timeout=10.0,
        )
    if pn_resp.status_code != 200 or not pn_resp.json():
        return {"assistant": {}}

    pn = pn_resp.json()[0]
    agent_id = pn.get("agent_id")
    if not agent_id:
        return {"assistant": {}}

    # Load voice_agent
    async with httpx.AsyncClient() as client:
        agent_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/voice_agents",
            params={"id": f"eq.{agent_id}", "limit": "1"},
            headers=headers,
            timeout=10.0,
        )
    if agent_resp.status_code != 200 or not agent_resp.json():
        return {"assistant": {}}

    agent = agent_resp.json()[0]

    # Build and return Vapi assistant config
    config = vapi_service.build_vapi_config(
        name=agent["name"],
        vertical=agent["vertical"],
        system_prompt=agent.get("system_prompt"),
        first_message=agent.get("first_message"),
        voice_provider=agent["voice_provider"],
        voice_id=agent.get("voice_id"),
        language=agent["language"],
        max_call_duration_minutes=agent["max_call_duration_minutes"],
        knowledge_base=agent.get("knowledge_base"),
    )
    return {"assistant": config}


async def _handle_tool_calls(
    call: VapiCall | None,
    tool_call_list: list[VapiToolCall] | None,
) -> dict:
    """Handle Vapi tool/function calls and return results."""
    results = []
    org_id = await _resolve_org_id_for_call(call)
    organization = await _get_booking_organization(org_id) if org_id else None

    for tc in tool_call_list or []:
        if tc.function.name in {"check_availability", "book_appointment"} and organization is None:
            result = {
                "ok": False,
                "message": "I could not identify the organization for this call, so I cannot access appointment booking.",
            }
        elif tc.function.name == "check_availability":
            result = await calcom_service.check_availability(organization, tc.function.arguments)
        elif tc.function.name == "book_appointment":
            result = await calcom_service.create_booking(
                organization,
                tc.function.arguments,
                call.id if call else None,
            )
        else:
            result = "Fonction non supportée"
        results.append({"toolCallId": tc.id, "result": result})
    return {"results": results}


# ── Endpoint ─────────────────────────────────────────────────


@router.post("/webhooks/vapi")
async def vapi_webhook(
    payload: VapiWebhookPayload,
    x_vapi_secret: Annotated[str | None, Header()] = None,
) -> dict:
    """Receive and process Vapi server-side webhook events.

    Always returns HTTP 200 to prevent Vapi retry storms.
    Internal errors are logged but do not surface as HTTP errors.
    """
    _verify_secret(x_vapi_secret)
    msg = payload.message

    try:
        match msg.type:
            case "end-of-call-report":
                await _handle_end_of_call_report(msg.call, msg.artifact)
                return {"received": True}
            case "status-update":
                await _handle_status_update(msg.call)
                return {"received": True}
            case "assistant-request":
                return await _handle_assistant_request(msg.call)
            case "tool-calls":
                return await _handle_tool_calls(msg.call, msg.tool_call_list)
            case _:
                return {"received": True}
    except Exception as exc:
        logger.error("Vapi webhook error [%s]: %s", msg.type, exc)
        return {"received": True}  # always 200 to Vapi
