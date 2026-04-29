"""Non-throwing automation event logger for PlainVoice activity timelines."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings
from app.dependencies import get_supabase

logger = logging.getLogger(__name__)

SUPABASE_URL = settings.next_public_supabase_url


async def log_automation_event(
    *,
    org_id: str | None,
    event_type: str,
    status: str,
    source: str,
    message: str,
    call_id: str | None = None,
    contact_id: str | None = None,
    agent_id: str | None = None,
    phone_number: str | None = None,
    error: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Write an automation event and never interrupt the primary flow."""
    if not org_id:
        return

    try:
        headers = get_supabase()
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SUPABASE_URL}/rest/v1/automation_events",
                headers=headers,
                json={
                    "org_id": org_id,
                    "event_type": event_type,
                    "status": status,
                    "source": source,
                    "call_id": call_id,
                    "contact_id": contact_id,
                    "agent_id": agent_id,
                    "phone_number": phone_number,
                    "message": message,
                    "error": error,
                    "metadata": metadata or {},
                },
                timeout=10.0,
            )
        if response.status_code not in (200, 201):
            logger.warning("Automation event insert failed: %s", response.text)
    except Exception as exc:
        logger.warning("Automation event logging failed: %s", exc)
