"""Cal.com v2 API service — slot availability and booking."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

CALCOM_BASE = "https://api.cal.com/v2"
TIMEZONE = "America/Toronto"  # Quebec timezone


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.calcom_api_key}",
        "cal-api-version": "2024-06-14",
        "Content-Type": "application/json",
    }


def _fmt_slot_fr(iso: str) -> str:
    """Convert ISO datetime to a readable Quebec French label, e.g. 'lundi le 7 avril à 14h30'."""
    DAYS_FR = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
    MONTHS_FR = [
        "", "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre",
    ]
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        # Convert to Eastern time (UTC-4 summer / UTC-5 winter) — rough offset
        dt_local = dt.astimezone(timezone(timedelta(hours=-4)))
        day_name = DAYS_FR[dt_local.weekday()]
        month_name = MONTHS_FR[dt_local.month]
        return f"{day_name} le {dt_local.day} {month_name} à {dt_local.strftime('%Hh%M').replace('h00', 'h')}"
    except Exception:
        return iso


async def get_available_slots(date_preference: str = "") -> list[dict]:
    """Return the next 5 available 30-min demo slots from Cal.com.

    Args:
        date_preference: Natural language hint from the prospect (ignored for now,
                         always returns the next available window).

    Returns:
        List of dicts with keys: iso (str), label_fr (str).
    """
    now = datetime.now(timezone.utc)
    start = now + timedelta(hours=2)   # minimum 2h booking notice
    end = start + timedelta(days=7)    # look one week ahead

    params = {
        "eventTypeId": settings.calcom_event_type_id,
        "startTime": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "endTime": end.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "timeZone": TIMEZONE,
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{CALCOM_BASE}/slots/available",
                headers=_headers(),
                params=params,
                timeout=10.0,
            )
        if resp.status_code != 200:
            logger.error("Cal.com slots error %s: %s", resp.status_code, resp.text)
            return []

        data = resp.json()
        # Response shape: {"data": {"slots": {"2024-04-07": [{"time": "..."}, ...], ...}}}
        slots_by_day: dict = data.get("data", {}).get("slots", {})

        result: list[dict] = []
        for day_slots in slots_by_day.values():
            for slot in day_slots:
                iso = slot.get("time", "")
                if iso:
                    result.append({"iso": iso, "label_fr": _fmt_slot_fr(iso)})
                if len(result) >= 5:
                    break
            if len(result) >= 5:
                break

        return result

    except Exception as exc:
        logger.error("Cal.com get_available_slots error: %s", exc)
        return []


def format_slots_for_agent(slots: list[dict]) -> str:
    """Turn slot list into a sentence Maxime can speak aloud."""
    if not slots:
        return (
            "Je n'ai pas de disponibilités dans les 7 prochains jours. "
            "Voulez-vous que je vous envoie le lien pour choisir vous-même?"
        )
    labels = [s["label_fr"] for s in slots]
    if len(labels) == 1:
        return f"J'ai une disponibilité: {labels[0]}. Ça vous conviendrait?"
    options = ", ".join(labels[:-1]) + f" ou {labels[-1]}"
    return f"J'ai ces disponibilités: {options}. Laquelle vous conviendrait le mieux?"


async def book_appointment(
    *,
    name: str,
    email: str,
    phone: str,
    start_time: str,
) -> dict:
    """Create a Cal.com booking for a VoixIA demo.

    Args:
        name: Prospect full name.
        email: Prospect email address.
        phone: Prospect phone number (stored in notes).
        start_time: ISO 8601 datetime string for the booking start.

    Returns:
        Dict with booking confirmation details, or error info.
    """
    payload = {
        "eventTypeId": int(settings.calcom_event_type_id),
        "start": start_time,
        "attendee": {
            "name": name,
            "email": email,
            "timeZone": TIMEZONE,
            "language": "fr",
        },
        "bookingFieldsResponses": {
            "notes": f"Téléphone: {phone}\nDémo VoixIA — réservé par Maxime (agent vocal IA)",
        },
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{CALCOM_BASE}/bookings",
                headers=_headers(),
                json=payload,
                timeout=15.0,
            )
        if resp.status_code in (200, 201):
            data = resp.json().get("data", resp.json())
            logger.info("Cal.com booking created: %s", data.get("id") or data.get("uid"))
            return {"success": True, "booking": data}
        else:
            logger.error("Cal.com booking error %s: %s", resp.status_code, resp.text)
            return {"success": False, "error": resp.text}

    except Exception as exc:
        logger.error("Cal.com book_appointment error: %s", exc)
        return {"success": False, "error": str(exc)}
