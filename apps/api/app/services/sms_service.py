"""Twilio SMS helpers for post-call follow-up messages."""

from __future__ import annotations

import logging
import re
from typing import Any

import httpx

from app.config import settings
from app.services import twilio_service

logger = logging.getLogger(__name__)

E164_RE = re.compile(r"^\+[1-9]\d{7,14}$")
TWILIO_MESSAGES_URL = (
    "https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
)


def normalize_phone_number(value: str | None) -> str | None:
    """Return a simple E.164-ish phone number, or None when invalid."""
    if not value:
        return None

    raw = value.strip()
    if not raw:
        return None

    if raw.startswith("+"):
        normalized = f"+{''.join(ch for ch in raw[1:] if ch.isdigit())}"
    else:
        digits = "".join(ch for ch in raw if ch.isdigit())
        if len(digits) == 10:
            normalized = f"+1{digits}"
        elif len(digits) == 11 and digits.startswith("1"):
            normalized = f"+{digits}"
        else:
            normalized = raw

    return normalized if E164_RE.match(normalized) else None


def validate_sms_request(*, to: str | None, body: str | None, sender: str | None) -> str | None:
    if not twilio_service.credentials_configured():
        return "Twilio credentials are not configured."
    if not normalize_phone_number(sender):
        return "SMS sender number is missing or invalid."
    if not normalize_phone_number(to):
        return "SMS recipient number is missing or invalid."
    if not body or not body.strip():
        return "SMS body is empty."
    return None


async def send_sms(*, to: str, body: str, sender: str) -> dict[str, Any]:
    """Send one SMS through Twilio and return a non-throwing status object."""
    validation_error = validate_sms_request(to=to, body=body, sender=sender)
    if validation_error:
        return {"ok": False, "status": "skipped", "error": validation_error}

    normalized_to = normalize_phone_number(to)
    normalized_sender = normalize_phone_number(sender)
    assert normalized_to is not None
    assert normalized_sender is not None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                TWILIO_MESSAGES_URL.format(account_sid=settings.twilio_account_sid),
                auth=(settings.twilio_account_sid, settings.twilio_auth_token),
                data={"To": normalized_to, "From": normalized_sender, "Body": body.strip()},
                timeout=15.0,
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.warning("Twilio SMS failed %s: %s", exc.response.status_code, exc.response.text)
        return {
            "ok": False,
            "status": "failed",
            "error": f"Twilio SMS failed with status {exc.response.status_code}.",
        }
    except httpx.HTTPError as exc:
        logger.warning("Twilio SMS request failed: %s", exc)
        return {"ok": False, "status": "failed", "error": "Could not reach Twilio SMS API."}

    payload = response.json()
    return {
        "ok": True,
        "status": payload.get("status") or "queued",
        "sid": payload.get("sid"),
        "to": normalized_to,
        "from": normalized_sender,
    }
