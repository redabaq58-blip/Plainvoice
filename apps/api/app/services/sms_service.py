"""Twilio SMS follow-up service for VoixIA — Maxime sales agent."""

from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

TWILIO_BASE = "https://api.twilio.com/2010-04-01"


def _build_followup_message(prospect_name: str, booking_confirmed: bool = False) -> str:
    """Build the French Quebec follow-up SMS text."""
    first_name = prospect_name.split()[0] if prospect_name else "vous"
    if booking_confirmed:
        return (
            f"Bonjour {first_name}! Ici Maxime de VoixIA 👋\n"
            f"Votre démo est confirmée — vous recevrez les détails par courriel.\n"
            f"Des questions? Répondez à ce message, on est là!\n"
            f"— L'équipe VoixIA"
        )
    return (
        f"Bonjour {first_name}! Ici Maxime de VoixIA 👋\n"
        f"Merci pour notre conversation! Voici le lien pour réserver votre démo gratuite de 30 min:\n"
        f"{settings.calcom_booking_link}\n"
        f"Des questions? Répondez à ce message.\n"
        f"— L'équipe VoixIA"
    )


async def send_followup_sms(
    to_number: str,
    prospect_name: str,
    booking_confirmed: bool = False,
) -> bool:
    """Send a Twilio SMS follow-up to the prospect.

    Args:
        to_number: E.164 phone number of the prospect, e.g. '+15141234567'.
        prospect_name: Full name or first name of the prospect.
        booking_confirmed: If True, sends a booking confirmation message instead.

    Returns:
        True if the SMS was sent successfully, False otherwise.
    """
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.warning("Twilio credentials not configured — SMS skipped")
        return False

    from_number = settings.twilio_phone_number
    if not from_number:
        logger.warning("TWILIO_PHONE_NUMBER not set — SMS skipped")
        return False

    # Normalize to E.164 if it's a 10-digit Quebec number
    to_e164 = to_number.strip()
    if to_e164.startswith("1") and len(to_e164) == 11 and not to_e164.startswith("+"):
        to_e164 = f"+{to_e164}"
    elif len(to_e164) == 10 and to_e164.isdigit():
        to_e164 = f"+1{to_e164}"

    body = _build_followup_message(prospect_name, booking_confirmed)

    url = f"{TWILIO_BASE}/Accounts/{settings.twilio_account_sid}/Messages.json"

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                auth=(settings.twilio_account_sid, settings.twilio_auth_token),
                data={"From": from_number, "To": to_e164, "Body": body},
                timeout=10.0,
            )
        if resp.status_code in (200, 201):
            sid = resp.json().get("sid", "")
            logger.info("SMS sent to %s — sid=%s", to_e164, sid)
            return True
        else:
            logger.error("Twilio SMS error %s: %s", resp.status_code, resp.text)
            return False

    except Exception as exc:
        logger.error("send_followup_sms error: %s", exc)
        return False
