"""Cal.com v2 service for appointment availability and booking."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

CALCOM_BASE = "https://api.cal.com/v2"
SLOTS_API_VERSION = "2024-09-04"
BOOKINGS_API_VERSION = "2026-02-25"
DEFAULT_TIMEZONE = "America/Toronto"

logger = logging.getLogger(__name__)


def _headers(api_key: str, api_version: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "cal-api-version": api_version,
    }


def _organization_timezone(timezone_name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(timezone_name or DEFAULT_TIMEZONE)
    except ZoneInfoNotFoundError:
        return ZoneInfo(DEFAULT_TIMEZONE)


def _parse_datetime(value: object, tz: ZoneInfo) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None

    raw = value.strip()
    if raw.endswith("Z"):
        raw = f"{raw[:-1]}+00:00"

    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError:
        return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=tz)

    return parsed.astimezone(timezone.utc)


def _iso_utc(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _get_arg(arguments: dict, *keys: str) -> object:
    for key in keys:
        if key in arguments:
            return arguments[key]
    return None


def _event_type_id(value: object) -> int | None:
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    return None


def _missing_credentials_result() -> dict:
    return {
        "ok": False,
        "message": "Appointment booking is not configured yet. Please ask the business to connect Cal.com in Settings.",
    }


def _disabled_result() -> dict:
    return {
        "ok": False,
        "message": "Appointment booking is currently disabled for this organization.",
    }


def validate_booking_settings(organization: dict) -> dict | None:
    if not organization.get("booking_enabled"):
        return _disabled_result()

    if not organization.get("calcom_api_key") or not organization.get("calcom_event_type_id"):
        return _missing_credentials_result()

    if _event_type_id(organization.get("calcom_event_type_id")) is None:
        return {
            "ok": False,
            "message": "The Cal.com event type ID is invalid. Please update Cal.com Settings.",
        }

    return None


async def check_availability(organization: dict, arguments: dict) -> dict:
    """Fetch Cal.com slots for this organization."""
    settings_error = validate_booking_settings(organization)
    if settings_error:
        return settings_error

    tz = _organization_timezone(organization.get("timezone"))
    now = datetime.now(timezone.utc)
    start = _parse_datetime(_get_arg(arguments, "start", "dateFrom", "date_from"), tz) or now
    end = _parse_datetime(_get_arg(arguments, "end", "dateTo", "date_to"), tz) or (start + timedelta(days=7))
    event_type_id = _event_type_id(organization.get("calcom_event_type_id"))

    params: dict[str, object] = {
        "eventTypeId": event_type_id,
        "start": _iso_utc(start),
        "end": _iso_utc(end),
        "timeZone": organization.get("timezone") or DEFAULT_TIMEZONE,
        "format": "range",
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{CALCOM_BASE}/slots",
                headers=_headers(organization["calcom_api_key"], SLOTS_API_VERSION),
                params=params,
                timeout=20.0,
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.warning("Cal.com availability error %s: %s", exc.response.status_code, exc.response.text)
        return {
            "ok": False,
            "message": "I could not check appointment availability right now. Please try again later.",
        }
    except httpx.HTTPError as exc:
        logger.warning("Cal.com availability request failed: %s", exc)
        return {
            "ok": False,
            "message": "I could not reach Cal.com to check availability right now.",
        }

    data = response.json().get("data") or {}
    slots = []
    for day, day_slots in data.items():
        if not isinstance(day_slots, list):
            continue
        for slot in day_slots:
            if isinstance(slot, dict):
                slots.append({"date": day, "start": slot.get("start"), "end": slot.get("end")})

    if not slots:
        return {
            "ok": True,
            "message": "No appointment slots are available in that time range.",
            "slots": [],
        }

    return {
        "ok": True,
        "message": "Available appointment slots found.",
        "timezone": organization.get("timezone") or DEFAULT_TIMEZONE,
        "slots": slots[:10],
    }


async def create_booking(organization: dict, arguments: dict, call_id: str | None = None) -> dict:
    """Create a Cal.com booking for this organization."""
    settings_error = validate_booking_settings(organization)
    if settings_error:
        return settings_error

    tz = _organization_timezone(organization.get("timezone"))
    start = _parse_datetime(_get_arg(arguments, "start", "startTime", "start_time"), tz)
    if start is None:
        return {"ok": False, "message": "Please provide a valid appointment start time before booking."}

    name = str(_get_arg(arguments, "name", "attendeeName", "attendee_name") or "Phone caller").strip()
    email = str(_get_arg(arguments, "email", "attendeeEmail", "attendee_email") or "").strip()
    phone = str(_get_arg(arguments, "phone", "phoneNumber", "phone_number") or "").strip()
    notes = str(_get_arg(arguments, "notes", "reason", "description") or "").strip()

    if not email:
        return {"ok": False, "message": "Please collect the caller's email before booking the appointment."}

    payload: dict[str, object] = {
        "eventTypeId": _event_type_id(organization.get("calcom_event_type_id")),
        "start": _iso_utc(start),
        "attendee": {
            "name": name,
            "email": email,
            "timeZone": organization.get("timezone") or DEFAULT_TIMEZONE,
            **({"phoneNumber": phone} if phone else {}),
        },
        "metadata": {
            "source": "plainvoice_vapi",
            **({"vapi_call_id": call_id} if call_id else {}),
        },
    }
    if notes:
        payload["bookingFieldsResponses"] = {"notes": notes}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{CALCOM_BASE}/bookings",
                headers=_headers(organization["calcom_api_key"], BOOKINGS_API_VERSION),
                json=payload,
                timeout=20.0,
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.warning("Cal.com booking error %s: %s", exc.response.status_code, exc.response.text)
        return {
            "ok": False,
            "message": "I could not book that appointment. The time may no longer be available or required booking details may be missing.",
        }
    except httpx.HTTPError as exc:
        logger.warning("Cal.com booking request failed: %s", exc)
        return {
            "ok": False,
            "message": "I could not reach Cal.com to book the appointment right now.",
        }

    booking = response.json().get("data") or {}
    return {
        "ok": True,
        "message": "The appointment was booked successfully.",
        "booking": {
            "uid": booking.get("uid"),
            "start": booking.get("start"),
            "end": booking.get("end"),
            "status": booking.get("status"),
        },
    }
