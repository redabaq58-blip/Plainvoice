"""Vapi.ai assistant API service layer.

Wraps all Vapi HTTP calls using httpx.AsyncClient.
"""

from __future__ import annotations

import httpx

from app.config import settings

VAPI_BASE = "https://api.vapi.ai"


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.vapi_private_key}",
        "Content-Type": "application/json",
    }


def _map_voice_provider(provider: str) -> str:
    """Map our internal voice provider names to Vapi's expected values."""
    return {"elevenlabs": "11labs"}.get(provider, provider)


def build_vapi_config(
    *,
    name: str,
    system_prompt: str | None,
    first_message: str | None,
    voice_provider: str,
    voice_id: str | None,
    language: str,
    max_call_duration_minutes: int,
) -> dict:
    """Build the Vapi assistant config payload from agent fields."""
    return {
        "name": name,
        "model": {
            "provider": "anthropic",
            "model": "claude-sonnet-4-5-20250929",
            "messages": [
                {"role": "system", "content": system_prompt or ""},
            ],
        },
        "voice": {
            "provider": _map_voice_provider(voice_provider),
            "voiceId": voice_id or "21m00Tcm4TlvDq8ikWAM",
        },
        "firstMessage": first_message,
        "endCallFunctionEnabled": True,
        "recordingEnabled": True,
        "transcriber": {
            "provider": "deepgram",
            "language": "fr" if language == "fr" else "en",
        },
        "maxDurationSeconds": max_call_duration_minutes * 60,
    }


async def create_assistant(config: dict) -> dict:
    """POST /assistant — create a new Vapi assistant.

    Returns the full assistant object including 'id'.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{VAPI_BASE}/assistant",
            headers=_headers(),
            json=config,
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json()


async def update_assistant(assistant_id: str, config: dict) -> dict:
    """PATCH /assistant/{id} — update an existing Vapi assistant."""
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{VAPI_BASE}/assistant/{assistant_id}",
            headers=_headers(),
            json=config,
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json()


async def delete_assistant(assistant_id: str) -> None:
    """DELETE /assistant/{id} — remove a Vapi assistant."""
    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{VAPI_BASE}/assistant/{assistant_id}",
            headers=_headers(),
            timeout=30.0,
        )
        resp.raise_for_status()
