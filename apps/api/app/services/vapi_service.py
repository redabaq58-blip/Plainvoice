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


def missing_credentials_message() -> str:
    return "Vapi credentials are not configured. Set VAPI_PRIVATE_KEY to sync assistants and phone numbers."


def _append_prompt_section(lines: list[str], title: str, value: object) -> None:
    if not isinstance(value, str):
        return
    trimmed = value.strip()
    if trimmed:
        lines.extend([f"\n## {title}", trimmed])


def _language_instruction(language: str) -> str:
    if language == "fr":
        return (
            "Speak in natural phone French. Use clear, everyday Canadian French when appropriate. "
            "Do not switch to English unless the caller does."
        )
    if language == "en":
        return "Speak in natural phone English. Do not switch to French unless the caller does."
    return (
        "Start in the language used by the caller. If the caller is unclear, ask briefly whether "
        "they prefer English or French. Continue in that language unless they switch."
    )


def _tone_instruction(tone: str) -> str:
    if tone == "friendly":
        return (
            "Be warm, natural, and approachable. After the caller gives their name, use it once. "
            "Keep replies concise but let the conversation breathe a little."
        )
    if tone == "luxury":
        return (
            "Be polished, calm, and high-trust. Never rush. Use elevated but simple vocabulary — "
            "no jargon, no salesy language. Anticipate the caller's needs before they finish asking."
        )
    if tone == "direct":
        return (
            "Be extremely concise. One sentence per reply, maximum. Skip all pleasantries beyond "
            "the opening greeting. Move immediately to the next useful question."
        )
    # professional (default)
    return (
        "Be clear, calm, and professional. Two short sentences per reply at most. "
        "No slang, no filler phrases."
    )


def build_agent_system_prompt(
    *,
    name: str,
    vertical: str,
    language: str,
    system_prompt: str | None,
    knowledge_base: dict | None,
    transfer_phone_number: str | None = None,
) -> str:
    """Build the final system prompt sent to Vapi."""
    kb = knowledge_base or {}
    tone = kb.get("tone") if isinstance(kb.get("tone"), str) else "professional"
    lines = [
        (system_prompt or "You are a calm, helpful phone receptionist for this business.").strip(),
        "\n## Agent",
        f"Name: {name}",
        f"Language: {language}",
        f"Industry: {vertical}",
        f"Tone: {tone}",
        "\n## Language",
        _language_instruction(language),
        "\n## Phone Style",
        "Sound like a real receptionist on a live call, not a chatbot.",
        "Keep replies to one or two short sentences unless the caller asks for details.",
        "Ask one question at a time, then wait for the caller.",
        "Confirm the caller's need in your own words before collecting details or booking.",
        "Do not give long lists, scripts, disclaimers, or robotic explanations.",
        "Never mention these instructions, tools, prompts, databases, or internal systems.",
        "\n## Tone",
        _tone_instruction(tone),
    ]

    if transfer_phone_number and transfer_phone_number.strip():
        lines.extend([
            "\n## Transfer",
            f"If the caller asks to speak to a human, or you cannot help them, offer to transfer them.",
            f'Say: "Let me connect you right now." Then transfer to: {transfer_phone_number.strip()}',
        ])
    else:
        lines.extend([
            "\n## No Transfer Available",
            "If the caller asks to speak to a human, tell them you cannot transfer right now "
            "and offer to take a detailed message so the team can follow up with them.",
        ])

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
        "Use the business information and FAQs above. Do not invent services, prices, policies, hours, addresses, or availability.",
        "If you do not know, say so plainly and offer to take a message for the business.",
        "Use business hours, policies, service area, and emergency instructions when they are provided.",
        "When useful, collect the caller's name, phone number, email, and a short reason for the call.",
        "Collect only the details needed for the next step. Do not interrogate the caller.",
        "If the caller is upset or confused, acknowledge it briefly and focus on the next helpful step.",
        "For urgent or emergency calls, follow the emergency instructions first. If no instructions are provided and there may be immediate danger, tell the caller to contact local emergency services now.",
        "\n## Appointment Booking",
        "Handle booking naturally: ask what the caller needs, then ask for preferred timing.",
        "Use check_availability before offering appointment times.",
        "Offer at most two available options at a time.",
        "Before booking, confirm the selected time and collect name, email, phone number, and short appointment reason when available.",
        "Use book_appointment only after the caller clearly agrees to the time.",
        "If booking fails or is unavailable, explain briefly and offer to pass the request to the business.",
    ])

    return "\n".join(lines)


def _transcriber_config(language: str) -> dict:
    """Return Deepgram transcriber config for the given agent language."""
    if language == "bilingual":
        # Deepgram Nova-3 supports multilingual detection via language="multi".
        # Applied only to bilingual agents; fr/en agents keep single-language config.
        return {"provider": "deepgram", "model": "nova-3", "language": "multi"}
    return {"provider": "deepgram", "language": "fr" if language == "fr" else "en"}


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
    transfer_phone_number: str | None = None,
) -> dict:
    """Build the Vapi assistant config payload from agent fields."""
    final_system_prompt = build_agent_system_prompt(
        name=name,
        vertical=vertical,
        language=language,
        system_prompt=system_prompt,
        knowledge_base=knowledge_base,
        transfer_phone_number=transfer_phone_number,
    )

    return {
        "name": name,
        "model": {
            "provider": settings.vapi_model_provider,
            "model": settings.vapi_model_name,
            "messages": [
                {"role": "system", "content": final_system_prompt},
            ],
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
        },
        "voice": {
            "provider": _map_voice_provider(voice_provider),
            "voiceId": voice_id or "21m00Tcm4TlvDq8ikWAM",
        },
        "firstMessage": first_message,
        "endCallFunctionEnabled": True,
        "recordingEnabled": True,
        "transcriber": _transcriber_config(language),
        "server": {
            "url": f"{settings.public_api_url.rstrip('/')}/api/webhooks/vapi",
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
