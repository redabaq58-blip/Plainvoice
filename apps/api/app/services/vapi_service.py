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


def has_credentials() -> bool:
    """Return whether Vapi can be called in this environment."""
    return bool(settings.vapi_private_key.strip())


def _append_prompt_section(lines: list[str], title: str, value: object) -> None:
    if not isinstance(value, str):
        return
    trimmed = value.strip()
    if trimmed:
        lines.extend([f"\n## {title}", trimmed])


def build_agent_system_prompt(
    *,
    name: str,
    vertical: str,
    language: str,
    system_prompt: str | None,
    knowledge_base: dict | None,
) -> str:
    """Build the final system prompt sent to Vapi."""
    kb = knowledge_base or {}
    tone = kb.get("tone") if isinstance(kb.get("tone"), str) else "professional"
    lines = [
        (system_prompt or "You are a helpful AI receptionist for this business.").strip(),
        "\n## Agent",
        f"Name: {name}",
        f"Language: {language}",
        f"Industry: {vertical}",
        f"Tone: {tone}",
    ]

    _append_prompt_section(lines, "Business Description", kb.get("businessDescription"))
    _append_prompt_section(lines, "Services Offered", kb.get("servicesOffered"))
    _append_prompt_section(lines, "Pricing Notes", kb.get("pricingNotes"))
    _append_prompt_section(lines, "Policies", kb.get("policies"))
    _append_prompt_section(lines, "Emergency Instructions", kb.get("emergencyInstructions"))
    _append_prompt_section(lines, "Service Area / Address", kb.get("serviceArea"))

    faqs = kb.get("faqs")
    if isinstance(faqs, list):
        faq_lines: list[str] = []
        for faq in faqs:
            if not isinstance(faq, dict):
                continue
            question = faq.get("question")
            answer = faq.get("answer")
            if isinstance(question, str) and question.strip():
                faq_lines.append(f"Q: {question.strip()}")
            if isinstance(answer, str) and answer.strip():
                faq_lines.append(f"A: {answer.strip()}")
        if faq_lines:
            lines.append("\n## FAQs")
            lines.extend(faq_lines)

    lines.extend([
        "\n## Call Handling",
        "Answer using only the business information above when possible.",
        "If the caller asks for something unknown, say you will pass the message to the business.",
        "When callers ask about appointments, use check_availability before offering times.",
        "Before booking, collect the caller's name, email, desired time, and phone number when available.",
        "Keep responses concise, natural, and suitable for a phone conversation.",
    ])

    return "\n".join(lines)


def build_vapi_config(
    *,
    name: str,
    vertical: str,
    system_prompt: str | None,
    first_message: str | None,
    voice_provider: str,
    voice_id: str | None,
    language: str,
    max_call_duration_minutes: int,
    knowledge_base: dict | None,
) -> dict:
    """Build the Vapi assistant config payload from agent fields."""
    final_system_prompt = build_agent_system_prompt(
        name=name,
        vertical=vertical,
        language=language,
        system_prompt=system_prompt,
        knowledge_base=knowledge_base,
    )

    return {
        "name": name,
        "model": {
            "provider": "anthropic",
            "model": "claude-sonnet-4-5-20250929",
            "messages": [
                {"role": "system", "content": final_system_prompt},
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
        "server": {
            "url": f"{settings.public_api_url.rstrip('/')}/api/webhooks/vapi",
        },
        "tools": [
            {
                "type": "function",
                "async": False,
                "function": {
                    "name": "check_availability",
                    "description": "Check available appointment slots in the organization's Cal.com calendar.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "start": {
                                "type": "string",
                                "description": "Start of the requested range as ISO 8601. If only a date is known, use YYYY-MM-DD.",
                            },
                            "end": {
                                "type": "string",
                                "description": "End of the requested range as ISO 8601. If only a date is known, use YYYY-MM-DD.",
                            },
                        },
                        "required": ["start", "end"],
                    },
                },
            },
            {
                "type": "function",
                "async": False,
                "function": {
                    "name": "book_appointment",
                    "description": "Book an appointment in the organization's Cal.com calendar.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "start": {
                                "type": "string",
                                "description": "Appointment start time as ISO 8601.",
                            },
                            "name": {"type": "string", "description": "Attendee name."},
                            "email": {"type": "string", "description": "Attendee email."},
                            "phone": {"type": "string", "description": "Attendee phone number."},
                            "notes": {"type": "string", "description": "Short appointment notes or reason."},
                        },
                        "required": ["start", "name", "email"],
                    },
                },
            },
        ],
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


async def create_twilio_phone_number(
    *,
    number: str,
    name: str,
    server_url: str,
) -> dict:
    """Import a Twilio-owned phone number into Vapi for dynamic inbound routing."""
    payload = {
        "provider": "twilio",
        "number": number,
        "twilioAccountSid": settings.twilio_account_sid,
        "twilioAuthToken": settings.twilio_auth_token,
        "name": name[:40],
        "smsEnabled": False,
        "server": {
            "url": server_url,
        },
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{VAPI_BASE}/phone-number",
            headers=_headers(),
            json=payload,
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json()
