"""FastAPI dependencies for authentication and org resolution.

Since supabase-py is not installed (C++ compiler requirement), we call
the Supabase REST API directly with httpx to validate JWTs and resolve
org membership.
"""

from __future__ import annotations

from typing import Annotated

import httpx
from fastapi import Header, HTTPException

from app.config import settings

SUPABASE_URL = settings.next_public_supabase_url
SUPABASE_ANON_KEY = settings.next_public_supabase_anon_key
DEV_ORG_NAME = "PlainVoice Demo"
DEV_ORG_SLUG = "plainvoice-demo"
DEV_ORG_ID = "00000000-0000-0000-0000-000000000001"


def _local_auth_bypass_enabled() -> bool:
    local_api = settings.next_public_api_url.startswith(
        ("http://localhost", "http://127.0.0.1")
    )
    return (settings.dev_auth_bypass or settings.disable_auth) and local_api


async def _get_or_create_dev_org_id() -> str:
    headers = get_supabase()
    try:
        async with httpx.AsyncClient() as client:
            existing_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/organizations",
                params={
                    "slug": f"eq.{DEV_ORG_SLUG}",
                    "select": "id",
                    "limit": "1",
                },
                headers=headers,
                timeout=10.0,
            )
            if existing_resp.status_code == 200 and existing_resp.json():
                return existing_resp.json()[0]["id"]

            create_resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/organizations",
                headers={**headers, "Prefer": "return=representation"},
                json={"name": DEV_ORG_NAME, "slug": DEV_ORG_SLUG},
                timeout=10.0,
            )
    except httpx.RequestError:
        return DEV_ORG_ID

    if create_resp.status_code not in (200, 201) or not create_resp.json():
        raise HTTPException(status_code=503, detail="Could not create development organization")

    created = create_resp.json()
    if isinstance(created, list):
        created = created[0]
    return created["id"]


async def get_current_user_org(
    authorization: Annotated[str | None, Header()] = None,
) -> tuple[str, str]:
    """Extract org_id from the Supabase JWT in the Authorization header.

    Returns (org_id, access_token) so downstream code can forward the
    token to Supabase REST calls that honour RLS.

    Raises:
        HTTPException 401 if the token is invalid or missing.
        HTTPException 403 if the user has no org membership.
    """
    if _local_auth_bypass_enabled() and (
        authorization is None or authorization == "Bearer dev-bypass"
    ):
        return await _get_or_create_dev_org_id(), settings.supabase_service_role_key

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    access_token = authorization.removeprefix("Bearer ")

    # 1. Validate JWT and get user_id
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": SUPABASE_ANON_KEY,
            },
            timeout=10.0,
        )

    if user_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_data = user_resp.json()
    user_id: str = user_data.get("id", "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not resolve user")

    # 2. Get org_id from organization_members (uses user JWT so RLS applies)
    async with httpx.AsyncClient() as client:
        members_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/organization_members",
            params={
                "select": "org_id",
                "user_id": f"eq.{user_id}",
                "limit": "1",
            },
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": SUPABASE_ANON_KEY,
            },
            timeout=10.0,
        )

    if members_resp.status_code != 200:
        raise HTTPException(status_code=403, detail="Could not resolve organization")

    rows = members_resp.json()
    if not rows:
        raise HTTPException(status_code=403, detail="No organization membership found")

    org_id: str = rows[0]["org_id"]
    return org_id, access_token


# ── Service-role helpers (for webhook/server-to-server use) ──


def get_supabase() -> dict[str, str]:
    """Return service-role headers for trusted server-to-server Supabase REST calls.

    Never use these headers in client-facing endpoints — service role bypasses RLS.
    Safe to use in webhook handlers and background jobs.
    """
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }


async def get_org_from_vapi_call(vapi_call_id: str) -> str | None:
    """Return org_id for an existing call record identified by its Vapi call id.

    Queries the calls table using the service role (bypasses RLS).
    Returns None if no matching call record is found.
    Used for events (e.g. status-update) that arrive after the call record exists.
    """
    headers = get_supabase()
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/calls",
            params={
                "vapi_call_id": f"eq.{vapi_call_id}",
                "select": "org_id",
                "limit": "1",
            },
            headers=headers,
            timeout=10.0,
        )
    if resp.status_code != 200 or not resp.json():
        return None
    return resp.json()[0]["org_id"]
