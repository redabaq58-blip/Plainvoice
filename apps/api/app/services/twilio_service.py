"""Twilio phone-number search, purchase, and optional pricing helpers."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

import httpx

from app.config import settings

TWILIO_API_BASE = "https://api.twilio.com/2010-04-01"
TWILIO_PRICING_BASE = "https://pricing.twilio.com/v2"


def credentials_configured() -> bool:
    """Return True when Twilio credentials are available."""
    return bool(settings.twilio_account_sid and settings.twilio_auth_token)


def _auth() -> tuple[str, str]:
    return (settings.twilio_account_sid, settings.twilio_auth_token)


def _normalize_capabilities(raw: dict[str, Any] | None) -> dict[str, bool]:
    capabilities = raw or {}
    return {
        "voice": bool(capabilities.get("voice")),
        "sms": bool(capabilities.get("SMS") or capabilities.get("sms")),
        "mms": bool(capabilities.get("MMS") or capabilities.get("mms")),
    }


def _to_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


async def get_local_number_price() -> tuple[float | None, str | None]:
    """Return Canadian local-number monthly price, or null metadata on failure."""
    if not credentials_configured():
        return None, None

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{TWILIO_PRICING_BASE}/PhoneNumbers/Countries/CA",
                auth=_auth(),
                timeout=10.0,
            )
        if resp.status_code != 200:
            return None, None

        data = resp.json()
        currency = data.get("price_unit")
        prices = data.get("phone_number_prices") or []
        for price in prices:
            number_type = str(price.get("number_type", "")).lower()
            if number_type != "local":
                continue
            amount = _to_decimal(price.get("current_price") or price.get("base_price"))
            if amount is None:
                return None, currency
            return float(amount), currency
    except Exception:
        return None, None

    return None, None


async def search_available_local_numbers(
    *,
    area_code: str | None,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """Search Canadian local numbers available for purchase."""
    params: dict[str, str | int | bool] = {
        "VoiceEnabled": "true",
        "SmsEnabled": "true",
        "Limit": max(1, min(limit, 20)),
    }
    if area_code:
        params["AreaCode"] = area_code

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{TWILIO_API_BASE}/Accounts/{settings.twilio_account_sid}/AvailablePhoneNumbers/CA/Local.json",
            auth=_auth(),
            params=params,
            timeout=15.0,
        )
    resp.raise_for_status()

    monthly_cost, monthly_cost_currency = await get_local_number_price()
    numbers = resp.json().get("available_phone_numbers", [])
    return [
        {
            "phone_number": item.get("phone_number"),
            "friendly_name": item.get("friendly_name"),
            "locality": item.get("locality"),
            "region": item.get("region"),
            "country": item.get("iso_country") or "CA",
            "capabilities": _normalize_capabilities(item.get("capabilities")),
            "monthly_cost": monthly_cost,
            "monthly_cost_currency": monthly_cost_currency,
        }
        for item in numbers
        if item.get("phone_number")
    ]


async def purchase_local_number(*, phone_number: str, friendly_name: str | None) -> dict[str, Any]:
    """Purchase a Twilio local number by E.164 number."""
    data: dict[str, str] = {"PhoneNumber": phone_number}
    if friendly_name:
        data["FriendlyName"] = friendly_name

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{TWILIO_API_BASE}/Accounts/{settings.twilio_account_sid}/IncomingPhoneNumbers.json",
            auth=_auth(),
            data=data,
            timeout=20.0,
        )
    resp.raise_for_status()

    payload = resp.json()
    return {
        "sid": payload.get("sid"),
        "phone_number": payload.get("phone_number") or phone_number,
        "friendly_name": payload.get("friendly_name") or friendly_name,
        "country": payload.get("iso_country") or "CA",
        "capabilities": _normalize_capabilities(payload.get("capabilities")),
    }
