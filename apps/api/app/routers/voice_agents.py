"""Voice agents CRUD router.

All endpoints verify org ownership via the JWT auth dependency and
forward the user's token to Supabase REST so that RLS applies.
"""

from __future__ import annotations

from typing import Annotated, Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.config import settings
from app.dependencies import get_current_user_org
from app.services import vapi_service

router = APIRouter(tags=["voice-agents"])

SUPABASE_URL = settings.next_public_supabase_url
SUPABASE_ANON_KEY = settings.next_public_supabase_anon_key


# ── Pydantic models ─────────────────────────────────────────


class VoiceAgentCreate(BaseModel):
    name: str
    vertical: Literal[
        "dental", "plumbing", "hvac", "beauty",
        "trades", "restaurant", "legal", "general",
    ] = "general"
    language: Literal["fr", "en", "bilingual"] = "fr"
    voice_provider: Literal["elevenlabs", "azure", "deepgram"] = "elevenlabs"
    voice_id: str | None = None
    first_message: str | None = None
    system_prompt: str | None = None
    transfer_phone_number: str | None = None
    max_call_duration_minutes: int = 10
    status: Literal["draft", "active", "paused"] = "draft"


class VoiceAgentUpdate(BaseModel):
    name: str | None = None
    vertical: Literal[
        "dental", "plumbing", "hvac", "beauty",
        "trades", "restaurant", "legal", "general",
    ] | None = None
    language: Literal["fr", "en", "bilingual"] | None = None
    voice_provider: Literal["elevenlabs", "azure", "deepgram"] | None = None
    voice_id: str | None = None
    first_message: str | None = None
    system_prompt: str | None = None
    transfer_phone_number: str | None = None
    max_call_duration_minutes: int | None = None
    status: Literal["draft", "active", "paused"] | None = None


class VoiceAgentResponse(BaseModel):
    id: str
    org_id: str
    vapi_assistant_id: str | None = None
    name: str
    vertical: str
    status: str
    language: str
    voice_provider: str
    voice_id: str | None = None
    system_prompt: str | None = None
    first_message: str | None = None
    transfer_phone_number: str | None = None
    max_call_duration_minutes: int
    knowledge_base: list | None = None
    created_at: str
    updated_at: str
    total_calls: int = 0
    phone_number: str | None = None


# ── Helpers ──────────────────────────────────────────────────


def _supabase_headers(access_token: str) -> dict[str, str]:
    """Headers for Supabase REST calls using the user's JWT (RLS)."""
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }


# ── Endpoints ────────────────────────────────────────────────


OrgDep = Annotated[tuple[str, str], Depends(get_current_user_org)]


@router.get("/voice-agents", response_model=list[VoiceAgentResponse])
async def list_voice_agents(org: OrgDep) -> list[dict]:
    """List all voice agents for the authenticated user's org."""
    org_id, access_token = org
    headers = _supabase_headers(access_token)

    async with httpx.AsyncClient() as client:
        # Fetch agents with their linked phone number
        try:
            agents_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/voice_agents",
                params={
                    "select": "*, phone_numbers(phone_number)",
                    "org_id": f"eq.{org_id}",
                    "order": "created_at.desc",
                },
                headers=headers,
                timeout=10.0,
            )
            agents_resp.raise_for_status()
        except httpx.HTTPError:
            if access_token == settings.supabase_service_role_key:
                return []
            raise
        agents = agents_resp.json()

        # Fetch call counts per agent
        try:
            calls_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/calls",
                params={
                    "select": "agent_id",
                    "org_id": f"eq.{org_id}",
                },
                headers=headers,
                timeout=10.0,
            )
            calls_resp.raise_for_status()
        except httpx.HTTPError:
            if access_token == settings.supabase_service_role_key:
                calls = []
            else:
                raise
        else:
            calls = calls_resp.json()

    # Count calls per agent
    call_counts: dict[str, int] = {}
    for call in calls:
        aid = call.get("agent_id")
        if aid:
            call_counts[aid] = call_counts.get(aid, 0) + 1

    # Build response
    result = []
    for agent in agents:
        phone_numbers = agent.pop("phone_numbers", [])
        phone = phone_numbers[0]["phone_number"] if phone_numbers else None
        result.append({
            **agent,
            "total_calls": call_counts.get(agent["id"], 0),
            "phone_number": phone,
        })

    return result


@router.post("/voice-agents", response_model=VoiceAgentResponse, status_code=201)
async def create_voice_agent(body: VoiceAgentCreate, org: OrgDep) -> dict:
    """Create a new voice agent with Vapi sync."""
    org_id, access_token = org

    # 1. Build Vapi config and create assistant
    vapi_config = vapi_service.build_vapi_config(
        name=body.name,
        system_prompt=body.system_prompt,
        first_message=body.first_message,
        voice_provider=body.voice_provider,
        voice_id=body.voice_id,
        language=body.language,
        max_call_duration_minutes=body.max_call_duration_minutes,
    )

    try:
        vapi_result = await vapi_service.create_assistant(vapi_config)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Vapi API error: {exc.response.status_code}",
        ) from exc

    vapi_assistant_id = vapi_result.get("id")

    # 2. Insert into Supabase
    row = {
        "org_id": org_id,
        "vapi_assistant_id": vapi_assistant_id,
        "name": body.name,
        "vertical": body.vertical,
        "language": body.language,
        "voice_provider": body.voice_provider,
        "voice_id": body.voice_id,
        "first_message": body.first_message,
        "system_prompt": body.system_prompt,
        "transfer_phone_number": body.transfer_phone_number,
        "max_call_duration_minutes": body.max_call_duration_minutes,
        "status": body.status,
    }

    headers = {**_supabase_headers(access_token), "Prefer": "return=representation"}
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/voice_agents",
            headers=headers,
            json=row,
            timeout=10.0,
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail="Failed to save agent to database")

    created = resp.json()
    if isinstance(created, list):
        created = created[0]

    return {**created, "total_calls": 0, "phone_number": None}


@router.patch("/voice-agents/{agent_id}", response_model=VoiceAgentResponse)
async def update_voice_agent(
    agent_id: str, body: VoiceAgentUpdate, org: OrgDep,
) -> dict:
    """Update a voice agent and sync changes to Vapi."""
    org_id, access_token = org
    headers = _supabase_headers(access_token)

    # 1. Fetch existing agent (RLS ensures org scope)
    async with httpx.AsyncClient() as client:
        existing_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/voice_agents",
            params={"id": f"eq.{agent_id}", "org_id": f"eq.{org_id}", "limit": "1"},
            headers=headers,
            timeout=10.0,
        )
        existing_resp.raise_for_status()

    rows = existing_resp.json()
    if not rows:
        raise HTTPException(status_code=404, detail="Agent not found")

    existing = rows[0]

    # 2. Merge updates
    updates = body.model_dump(exclude_none=True)
    merged = {**existing, **updates}

    # 3. Sync to Vapi if assistant exists
    vapi_assistant_id = existing.get("vapi_assistant_id")
    if vapi_assistant_id:
        vapi_config = vapi_service.build_vapi_config(
            name=merged["name"],
            system_prompt=merged.get("system_prompt"),
            first_message=merged.get("first_message"),
            voice_provider=merged["voice_provider"],
            voice_id=merged.get("voice_id"),
            language=merged["language"],
            max_call_duration_minutes=merged["max_call_duration_minutes"],
        )
        try:
            await vapi_service.update_assistant(vapi_assistant_id, vapi_config)
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Vapi API error: {exc.response.status_code}",
            ) from exc

    # 4. Update in Supabase
    update_headers = {**headers, "Prefer": "return=representation"}
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/voice_agents",
            params={"id": f"eq.{agent_id}", "org_id": f"eq.{org_id}"},
            headers=update_headers,
            json=updates,
            timeout=10.0,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to update agent")

    updated = resp.json()
    if isinstance(updated, list):
        updated = updated[0]

    return {**updated, "total_calls": 0, "phone_number": None}


@router.delete("/voice-agents/{agent_id}")
async def delete_voice_agent(agent_id: str, org: OrgDep) -> Response:
    """Delete a voice agent and remove from Vapi."""
    org_id, access_token = org
    headers = _supabase_headers(access_token)

    # 1. Fetch existing agent
    async with httpx.AsyncClient() as client:
        existing_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/voice_agents",
            params={"id": f"eq.{agent_id}", "org_id": f"eq.{org_id}", "limit": "1"},
            headers=headers,
            timeout=10.0,
        )
        existing_resp.raise_for_status()

    rows = existing_resp.json()
    if not rows:
        raise HTTPException(status_code=404, detail="Agent not found")

    existing = rows[0]

    # 2. Delete from Vapi if assistant exists
    vapi_assistant_id = existing.get("vapi_assistant_id")
    if vapi_assistant_id:
        try:
            await vapi_service.delete_assistant(vapi_assistant_id)
        except httpx.HTTPStatusError:
            pass  # Best-effort: proceed with DB deletion even if Vapi fails

    # 3. Delete from Supabase
    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{SUPABASE_URL}/rest/v1/voice_agents",
            params={"id": f"eq.{agent_id}", "org_id": f"eq.{org_id}"},
            headers=headers,
            timeout=10.0,
        )

    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Failed to delete agent")

    return Response(status_code=204)
