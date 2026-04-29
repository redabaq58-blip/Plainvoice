"""Vapi server-side webhook handler.

Receives call lifecycle events from Vapi and persists data to Supabase.
Always returns HTTP 200 to Vapi (even on internal errors) to prevent retries.

Event types handled:
- end-of-call-report  : insert call record, update org usage + contact counts
- status-update       : update call status on existing record
- assistant-request   : return Vapi assistant config for the called phone number
- tool-calls          : return mock tool results (e.g. check_availability)
"""

from __future__ import annotations

import logging
from math import ceil
from typing import Annotated

import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.config import settings
from app.dependencies import get_org_from_vapi_call, get_supabase
from app.services import automation_events, calcom_service, sms_service, vapi_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["vapi-webhooks"])

SUPABASE_URL = settings.next_public_supabase_url


# ── Security ─────────────────────────────────────────────────


def _verify_secret(x_vapi_secret: str | None) -> None:
    """Reject requests whose x-vapi-secret header doesn't match our config."""
    expected = settings.vapi_webhook_secret
    if expected and x_vapi_secret != expected:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")


# ── Pydantic models ──────────────────────────────────────────


class VapiPhoneNumber(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    number: str | None = None


class VapiCustomer(BaseModel):
    number: str | None = None


class VapiCallMetadata(BaseModel):
    model_config = ConfigDict(extra="allow")
    org_id: str | None = None  # set by web clients when starting a call


class VapiCall(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    call_type: str | None = Field(None, alias="type")  # webCall | inboundPhoneCall | outboundPhoneCall
    assistant_id: str | None = Field(None, alias="assistantId")
    phone_number: VapiPhoneNumber | None = Field(None, alias="phoneNumber")
    customer: VapiCustomer | None = None
    metadata: VapiCallMetadata | None = None
    status: str | None = None
    started_at: str | None = Field(None, alias="startedAt")
    ended_at: str | None = Field(None, alias="endedAt")
    ended_reason: str | None = Field(None, alias="endedReason")
    duration_seconds: float | None = Field(None, alias="durationSeconds")


class VapiTranscriptEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    role: str
    content: str = Field(alias="message")  # Vapi sends "message"; guide stores as "content"


class VapiArtifact(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    messages: list[VapiTranscriptEntry] | None = None  # structured transcript array
    recording_url: str | None = Field(None, alias="recordingUrl")
    summary: str | None = None


class VapiToolCallFunction(BaseModel):
    name: str
    arguments: dict = {}


class VapiToolCall(BaseModel):
    id: str
    function: VapiToolCallFunction


class VapiMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    type: str
    call: VapiCall | None = None
    artifact: VapiArtifact | None = None
    tool_call_list: list[VapiToolCall] | None = Field(None, alias="toolCallList")


class VapiWebhookPayload(BaseModel):
    message: VapiMessage


# ── Helpers ──────────────────────────────────────────────────


def _map_direction(call_type: str | None) -> str:
    """Map Vapi call type to our direction field."""
    if call_type == "webCall":
        return "web"
    if call_type == "outboundPhoneCall":
        return "outbound"
    return "inbound"


# ── Event handlers ───────────────────────────────────────────


async def _handle_end_of_call_report(
    call: VapiCall | None,
    artifact: VapiArtifact | None,
) -> None:
    """Persist completed call data and update org usage + contact counts."""
    if not call:
        return

    headers = get_supabase()
    org_id: str | None = None
    agent_id: str | None = None
    called_number: str | None = None

    # Org resolution: phone call → phone_numbers table; web call → metadata
    if call.phone_number and call.phone_number.number:
        called_number = call.phone_number.number
        async with httpx.AsyncClient() as client:
            pn_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/phone_numbers",
                params={
                    "phone_number": f"eq.{called_number}",
                    "select": "org_id,agent_id",
                    "limit": "1",
                },
                headers=headers,
                timeout=10.0,
            )
        if pn_resp.status_code == 200 and pn_resp.json():
            row = pn_resp.json()[0]
            org_id = row["org_id"]
            agent_id = row["agent_id"]
    elif call.metadata and call.metadata.org_id:
        # Web call: org_id passed by client in metadata
        org_id = call.metadata.org_id

    if not org_id:
        logger.warning("Could not resolve org for vapi_call_id=%s", call.id)
        return

    # Build transcript JSON from structured messages
    transcript_json: list[dict] | None = None
    if artifact and artifact.messages:
        transcript_json = [entry.model_dump() for entry in artifact.messages]

    credits_used = ceil(call.duration_seconds / 60) if call.duration_seconds else 0
    from_number = call.customer.number if call.customer else None

    # Upsert call record
    row_data = {
        "org_id": org_id,
        "agent_id": agent_id,
        "vapi_call_id": call.id,
        "direction": _map_direction(call.call_type),
        "status": "completed",
        "from_number": from_number,
        "to_number": called_number,
        "started_at": call.started_at,
        "ended_at": call.ended_at,
        "duration_seconds": int(call.duration_seconds) if call.duration_seconds else None,
        "ended_reason": call.ended_reason,
        "transcript": transcript_json,
        "summary": artifact.summary if artifact else None,
        "recording_url": artifact.recording_url if artifact else None,
        "credits_used": credits_used,
    }
    upsert_headers = {
        **headers,
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    async with httpx.AsyncClient() as client:
        upsert_resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/calls",
            params={"on_conflict": "vapi_call_id"},
            headers=upsert_headers,
            json=row_data,
            timeout=10.0,
        )
    if upsert_resp.status_code not in (200, 201):
        logger.error("Failed to upsert call: %s", upsert_resp.text)
        return

    upserted_call = upsert_resp.json()
    if isinstance(upserted_call, list):
        upserted_call = upserted_call[0] if upserted_call else {}
    call_row_id = upserted_call.get("id") if isinstance(upserted_call, dict) else None
    booking_result = upserted_call.get("booking_result") if isinstance(upserted_call, dict) else None
    existing_sms_status = upserted_call.get("sms_status") if isinstance(upserted_call, dict) else {}

    await automation_events.log_automation_event(
        org_id=org_id,
        event_type="call_saved",
        status="success",
        source="vapi",
        call_id=call_row_id,
        agent_id=agent_id,
        phone_number=from_number,
        message=f"Call saved from {from_number or 'unknown caller'}.",
        metadata={"vapi_call_id": call.id, "duration_seconds": call.duration_seconds},
    )
    if transcript_json:
        await automation_events.log_automation_event(
            org_id=org_id,
            event_type="transcript_saved",
            status="success",
            source="vapi",
            call_id=call_row_id,
            agent_id=agent_id,
            phone_number=from_number,
            message="Transcript saved for call.",
            metadata={"vapi_call_id": call.id, "message_count": len(transcript_json)},
        )
    if artifact and artifact.summary:
        await automation_events.log_automation_event(
            org_id=org_id,
            event_type="summary_saved",
            status="success",
            source="vapi",
            call_id=call_row_id,
            agent_id=agent_id,
            phone_number=from_number,
            message="AI summary saved for call.",
            metadata={"vapi_call_id": call.id},
        )

    # Update org voice_minutes_used and credits_balance
    minutes_used = int(call.duration_seconds / 60) if call.duration_seconds else 0
    async with httpx.AsyncClient() as client:
        org_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/organizations",
            params={"id": f"eq.{org_id}", "select": "voice_minutes_used,credits_balance"},
            headers=headers,
            timeout=10.0,
        )
    if org_resp.status_code == 200 and org_resp.json():
        current = org_resp.json()[0]
        async with httpx.AsyncClient() as client:
            await client.patch(
                f"{SUPABASE_URL}/rest/v1/organizations",
                params={"id": f"eq.{org_id}"},
                headers=headers,
                json={
                    "voice_minutes_used": current["voice_minutes_used"] + minutes_used,
                    "credits_balance": current["credits_balance"] - credits_used,
                },
                timeout=10.0,
            )

    # Update contact total_calls if matching contact exists
    from_number = call.customer.number if call.customer else None
    contact_id: str | None = None
    if from_number:
        async with httpx.AsyncClient() as client:
            contact_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/contacts",
                params={
                    "org_id": f"eq.{org_id}",
                    "phone": f"eq.{from_number}",
                    "select": "id,total_calls",
                    "limit": "1",
                },
                headers=headers,
                timeout=10.0,
            )
        if contact_resp.status_code == 200 and contact_resp.json():
            contact = contact_resp.json()[0]
            contact_id = contact["id"]
            async with httpx.AsyncClient() as client:
                await client.patch(
                    f"{SUPABASE_URL}/rest/v1/contacts",
                    params={"id": f"eq.{contact['id']}"},
                    headers=headers,
                    json={
                        "total_calls": contact["total_calls"] + 1,
                        "last_call_at": "now()",
                    },
                    timeout=10.0,
                )

    sms_organization = await _get_sms_organization(org_id)
    if sms_organization:
        await _send_sms_followups(
            call=call,
            artifact=artifact,
            organization=sms_organization,
            booking_result=booking_result if isinstance(booking_result, dict) else None,
            existing_sms_status=existing_sms_status if isinstance(existing_sms_status, dict) else {},
            call_row_id=call_row_id,
            contact_id=contact_id,
            agent_id=agent_id,
        )


async def _handle_status_update(call: VapiCall | None) -> None:
    """Update call status for an existing call record."""
    if not call or not call.status:
        return

    org_id = await get_org_from_vapi_call(call.id)
    if org_id is None:
        return  # call not yet in DB, skip silently

    headers = get_supabase()
    async with httpx.AsyncClient() as client:
        await client.patch(
            f"{SUPABASE_URL}/rest/v1/calls",
            params={"vapi_call_id": f"eq.{call.id}"},
            headers=headers,
            json={"status": call.status},
            timeout=10.0,
        )


async def _resolve_org_id_for_call(call: VapiCall | None) -> str | None:
    if not call:
        return None

    if call.metadata and call.metadata.org_id:
        return call.metadata.org_id

    org_id = await get_org_from_vapi_call(call.id)
    if org_id:
        return org_id

    called_number = call.phone_number.number if call.phone_number else None
    if not called_number:
        return None

    headers = get_supabase()
    async with httpx.AsyncClient() as client:
        pn_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/phone_numbers",
            params={
                "phone_number": f"eq.{called_number}",
                "select": "org_id",
                "limit": "1",
            },
            headers=headers,
            timeout=10.0,
        )
    if pn_resp.status_code == 200 and pn_resp.json():
        return pn_resp.json()[0].get("org_id")

    return None


async def _get_booking_organization(org_id: str) -> dict | None:
    headers = get_supabase()
    async with httpx.AsyncClient() as client:
        org_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/organizations",
            params={
                "id": f"eq.{org_id}",
                "select": "id,timezone,booking_enabled,calcom_api_key,calcom_event_type_id,calcom_username",
                "limit": "1",
            },
            headers=headers,
            timeout=10.0,
        )
    if org_resp.status_code == 200 and org_resp.json():
        return org_resp.json()[0]

    return None


async def _get_sms_organization(org_id: str) -> dict | None:
    headers = get_supabase()
    async with httpx.AsyncClient() as client:
        org_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/organizations",
            params={
                "id": f"eq.{org_id}",
                "select": (
                    "id,name,sms_enabled,sms_sender_phone_number_id,sms_sender_number,"
                    "owner_notification_phone,sms_followup_template,"
                    "sms_booking_confirmation_template,sms_missed_call_template"
                ),
                "limit": "1",
            },
            headers=headers,
            timeout=10.0,
        )
    if org_resp.status_code == 200 and org_resp.json():
        return org_resp.json()[0]

    return None


async def _resolve_sms_sender(organization: dict, headers: dict[str, str]) -> str | None:
    sender_id = organization.get("sms_sender_phone_number_id")
    if sender_id:
        async with httpx.AsyncClient() as client:
            sender_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/phone_numbers",
                params={
                    "id": f"eq.{sender_id}",
                    "org_id": f"eq.{organization['id']}",
                    "is_active": "eq.true",
                    "select": "phone_number,capabilities",
                    "limit": "1",
                },
                headers=headers,
                timeout=10.0,
            )
        if sender_resp.status_code == 200 and sender_resp.json():
            row = sender_resp.json()[0]
            capabilities = row.get("capabilities") or {}
            if capabilities.get("sms") is not False:
                return row.get("phone_number")

    return organization.get("sms_sender_number") or settings.twilio_phone_number or None


def _render_sms_template(template: str | None, fallback: str, context: dict[str, object]) -> str:
    message = template.strip() if template and template.strip() else fallback
    for key, value in context.items():
        message = message.replace(f"{{{key}}}", "" if value is None else str(value))
    return message


def _is_missed_call(call: VapiCall) -> bool:
    reason = (call.ended_reason or "").lower()
    return (
        call.duration_seconds is not None
        and call.duration_seconds <= 0
        or "no-answer" in reason
        or "missed" in reason
    )


async def _patch_call_sms_status(vapi_call_id: str, sms_status: dict) -> None:
    headers = get_supabase()
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/calls",
            params={"vapi_call_id": f"eq.{vapi_call_id}"},
            headers=headers,
            json={"sms_status": sms_status},
            timeout=10.0,
        )
    if resp.status_code not in (200, 204):
        logger.warning("Failed to store SMS status for call %s: %s", vapi_call_id, resp.text)


def _sms_history_status(result: dict | None = None, *, fallback: str = "skipped") -> str:
    if result and result.get("ok"):
        return "sent"
    status = (result or {}).get("status") or fallback
    return "skipped" if status == "skipped" else "failed"


async def _record_sms_message(
    *,
    org_id: str | None,
    recipient: str | None,
    sender: str | None,
    body: str,
    status: str,
    message_type: str,
    call_id: str | None = None,
    contact_id: str | None = None,
    agent_id: str | None = None,
    result: dict | None = None,
    error: str | None = None,
    metadata: dict | None = None,
) -> None:
    if not org_id:
        return

    payload = {
        "org_id": org_id,
        "recipient": recipient,
        "sender": sender,
        "body": body,
        "status": status,
        "message_type": message_type,
        "call_id": call_id,
        "contact_id": contact_id,
        "agent_id": agent_id,
        "source": "twilio",
        "provider_message_id": (result or {}).get("sid"),
        "provider_status": (result or {}).get("status"),
        "error": error or (result or {}).get("error"),
        "metadata": metadata or {},
    }

    try:
        headers = get_supabase()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/sms_messages",
                headers=headers,
                json=payload,
                timeout=10.0,
            )
        if resp.status_code not in (200, 201):
            logger.warning("SMS history insert failed: %s", resp.text)
    except Exception as exc:
        logger.warning("SMS history logging failed: %s", exc)


async def _store_booking_result(call: VapiCall | None, org_id: str, booking_result: dict) -> None:
    if not call:
        return

    headers = get_supabase()
    upsert_headers = {
        **headers,
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/calls",
            params={"on_conflict": "vapi_call_id"},
            headers=upsert_headers,
            json={
                "org_id": org_id,
                "vapi_call_id": call.id,
                "direction": _map_direction(call.call_type),
                "status": call.status or "queued",
                "from_number": call.customer.number if call.customer else None,
                "to_number": call.phone_number.number if call.phone_number else None,
                "booking_result": booking_result,
            },
            timeout=10.0,
        )
    if resp.status_code not in (200, 201):
        logger.warning("Failed to store booking result for SMS follow-up: %s", resp.text)


async def _send_sms_followups(
    *,
    call: VapiCall,
    artifact: VapiArtifact | None,
    organization: dict,
    booking_result: dict | None,
    existing_sms_status: dict | None,
    call_row_id: str | None = None,
    contact_id: str | None = None,
    agent_id: str | None = None,
) -> None:
    if not organization.get("sms_enabled"):
        skipped_body = "SMS follow-up skipped because SMS is disabled."
        customer_phone = call.customer.number if call.customer else None
        fallback_sender = organization.get("sms_sender_number") or settings.twilio_phone_number or None
        if customer_phone:
            await _record_sms_message(
                org_id=organization.get("id"),
                recipient=customer_phone,
                sender=fallback_sender,
                body=skipped_body,
                status="skipped",
                message_type="follow_up",
                call_id=call_row_id,
                contact_id=contact_id,
                agent_id=agent_id,
                metadata={"vapi_call_id": call.id},
            )
        await _record_sms_message(
            org_id=organization.get("id"),
            recipient=organization.get("owner_notification_phone"),
            sender=fallback_sender,
            body="Owner notification skipped because SMS is disabled.",
            status="skipped",
            message_type="owner_notification",
            call_id=call_row_id,
            contact_id=contact_id,
            agent_id=agent_id,
            metadata={"vapi_call_id": call.id},
        )
        await automation_events.log_automation_event(
            org_id=organization.get("id"),
            event_type="sms_attempted",
            status="skipped",
            source="twilio",
            call_id=call_row_id,
            agent_id=agent_id,
            phone_number=call.customer.number if call.customer else None,
            message="SMS follow-up skipped because SMS is disabled.",
            metadata={"vapi_call_id": call.id},
        )
        await automation_events.log_automation_event(
            org_id=organization.get("id"),
            event_type="owner_notification_skipped",
            status="skipped",
            source="twilio",
            call_id=call_row_id,
            agent_id=agent_id,
            phone_number=organization.get("owner_notification_phone"),
            message="Owner notification skipped because SMS is disabled.",
            metadata={"vapi_call_id": call.id},
        )
        return

    headers = get_supabase()
    sender = await _resolve_sms_sender(organization, headers)
    summary = artifact.summary if artifact and artifact.summary else "No summary available."
    customer_phone = call.customer.number if call.customer else None
    context = {
        "organization_name": organization.get("name") or "PlainVoice",
        "customer_phone": customer_phone or "Unknown caller",
        "summary": summary,
        "booking_start": (booking_result or {}).get("booking", {}).get("start"),
        "booking_end": (booking_result or {}).get("booking", {}).get("end"),
    }
    status = dict(existing_sms_status or {})

    owner_phone = organization.get("owner_notification_phone")
    if owner_phone:
        await automation_events.log_automation_event(
            org_id=organization.get("id"),
            event_type="sms_attempted",
            status="info",
            source="twilio",
            call_id=call_row_id,
            agent_id=agent_id,
            phone_number=owner_phone,
            message="Owner notification SMS attempted.",
            metadata={"vapi_call_id": call.id, "recipient": "owner"},
        )
        is_missed = _is_missed_call(call)
        owner_body = _render_sms_template(
            organization.get("sms_missed_call_template" if is_missed else "sms_followup_template"),
            (
                "PlainVoice missed a call from {customer_phone}."
                if is_missed
                else "PlainVoice call from {customer_phone}: {summary}"
            ),
            context,
        )
        owner_result = await sms_service.send_sms(to=owner_phone, sender=sender or "", body=owner_body)
        status["owner_summary"] = owner_result
        await _record_sms_message(
            org_id=organization.get("id"),
            recipient=owner_phone,
            sender=sender,
            body=owner_body,
            status=_sms_history_status(owner_result),
            message_type="owner_notification",
            call_id=call_row_id,
            contact_id=contact_id,
            agent_id=agent_id,
            result=owner_result,
            metadata={"vapi_call_id": call.id, "recipient": "owner"},
        )
        if owner_result.get("ok"):
            await automation_events.log_automation_event(
                org_id=organization.get("id"),
                event_type="owner_notification_sent",
                status="success",
                source="twilio",
                call_id=call_row_id,
                agent_id=agent_id,
                phone_number=owner_phone,
                message="Owner notification SMS sent.",
                metadata={"vapi_call_id": call.id, "twilio": owner_result},
            )
        else:
            logger.warning("Owner summary SMS skipped/failed: %s", owner_result.get("error"))
            await automation_events.log_automation_event(
                org_id=organization.get("id"),
                event_type="sms_failed",
                status=owner_result.get("status") or "failed",
                source="twilio",
                call_id=call_row_id,
                agent_id=agent_id,
                phone_number=owner_phone,
                message="Owner notification SMS was not sent.",
                error=owner_result.get("error"),
                metadata={"vapi_call_id": call.id, "twilio": owner_result},
            )
    else:
        await _record_sms_message(
            org_id=organization.get("id"),
            recipient=None,
            sender=sender,
            body="Owner notification skipped because no owner phone is configured.",
            status="skipped",
            message_type="owner_notification",
            call_id=call_row_id,
            contact_id=contact_id,
            agent_id=agent_id,
            metadata={"vapi_call_id": call.id, "recipient": "owner"},
        )
        await automation_events.log_automation_event(
            org_id=organization.get("id"),
            event_type="owner_notification_skipped",
            status="skipped",
            source="twilio",
            call_id=call_row_id,
            agent_id=agent_id,
            message="Owner notification skipped because no owner phone is configured.",
            metadata={"vapi_call_id": call.id},
        )

    if booking_result and booking_result.get("ok") and customer_phone:
        await automation_events.log_automation_event(
            org_id=organization.get("id"),
            event_type="sms_attempted",
            status="info",
            source="twilio",
            call_id=call_row_id,
            agent_id=agent_id,
            phone_number=customer_phone,
            message="Booking confirmation SMS attempted.",
            metadata={"vapi_call_id": call.id, "recipient": "customer"},
        )
        booking_body = _render_sms_template(
            organization.get("sms_booking_confirmation_template"),
            "Your appointment is booked for {booking_start}.",
            context,
        )
        booking_sms = await sms_service.send_sms(
            to=customer_phone,
            sender=sender or "",
            body=booking_body,
        )
        status["booking_confirmation"] = booking_sms
        await _record_sms_message(
            org_id=organization.get("id"),
            recipient=customer_phone,
            sender=sender,
            body=booking_body,
            status=_sms_history_status(booking_sms),
            message_type="booking_confirmation",
            call_id=call_row_id,
            contact_id=contact_id,
            agent_id=agent_id,
            result=booking_sms,
            metadata={"vapi_call_id": call.id, "recipient": "customer"},
        )
        if booking_sms.get("ok"):
            await automation_events.log_automation_event(
                org_id=organization.get("id"),
                event_type="sms_sent",
                status="success",
                source="twilio",
                call_id=call_row_id,
                agent_id=agent_id,
                phone_number=customer_phone,
                message="Booking confirmation SMS sent.",
                metadata={"vapi_call_id": call.id, "twilio": booking_sms},
            )
        else:
            logger.warning("Booking confirmation SMS skipped/failed: %s", booking_sms.get("error"))
            await automation_events.log_automation_event(
                org_id=organization.get("id"),
                event_type="sms_failed",
                status=booking_sms.get("status") or "failed",
                source="twilio",
                call_id=call_row_id,
                agent_id=agent_id,
                phone_number=customer_phone,
                message="Booking confirmation SMS was not sent.",
                error=booking_sms.get("error"),
                metadata={"vapi_call_id": call.id, "twilio": booking_sms},
            )

    if status:
        await _patch_call_sms_status(call.id, status)


async def _handle_assistant_request(call: VapiCall | None) -> dict:
    """Return the Vapi assistant config for the called phone number."""
    if not call:
        return {"assistant": {}}

    called_number = call.phone_number.number if call.phone_number else None
    if not called_number:
        return {"assistant": {}}  # web call without phone number

    headers = get_supabase()

    # Look up phone_numbers by our Twilio number
    async with httpx.AsyncClient() as client:
        pn_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/phone_numbers",
            params={
                "phone_number": f"eq.{called_number}",
                "select": "agent_id,org_id",
                "limit": "1",
            },
            headers=headers,
            timeout=10.0,
        )
    if pn_resp.status_code != 200 or not pn_resp.json():
        return {"assistant": {}}

    pn = pn_resp.json()[0]
    await automation_events.log_automation_event(
        org_id=pn.get("org_id"),
        event_type="call_received",
        status="info",
        source="vapi",
        agent_id=pn.get("agent_id"),
        phone_number=call.customer.number if call.customer else called_number,
        message=f"Call received from {call.customer.number if call.customer else 'unknown caller'}.",
        metadata={"vapi_call_id": call.id, "to_number": called_number},
    )
    agent_id = pn.get("agent_id")
    if not agent_id:
        return {"assistant": {}}

    # Load voice_agent
    async with httpx.AsyncClient() as client:
        agent_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/voice_agents",
            params={"id": f"eq.{agent_id}", "limit": "1"},
            headers=headers,
            timeout=10.0,
        )
    if agent_resp.status_code != 200 or not agent_resp.json():
        return {"assistant": {}}

    agent = agent_resp.json()[0]

    # Build and return Vapi assistant config
    config = vapi_service.build_vapi_config(
        name=agent["name"],
        vertical=agent["vertical"],
        system_prompt=agent.get("system_prompt"),
        first_message=agent.get("first_message"),
        voice_provider=agent["voice_provider"],
        voice_id=agent.get("voice_id"),
        language=agent["language"],
        max_call_duration_minutes=agent["max_call_duration_minutes"],
        knowledge_base=agent.get("knowledge_base"),
    )
    return {"assistant": config}


async def _handle_tool_calls(
    call: VapiCall | None,
    tool_call_list: list[VapiToolCall] | None,
) -> dict:
    """Handle Vapi tool/function calls and return results."""
    results = []
    org_id = await _resolve_org_id_for_call(call)
    organization = await _get_booking_organization(org_id) if org_id else None

    for tc in tool_call_list or []:
        if tc.function.name in {"check_availability", "book_appointment"} and organization is None:
            result = {
                "ok": False,
                "message": "I could not identify the organization for this call, so I cannot access appointment booking.",
            }
            await automation_events.log_automation_event(
                org_id=org_id,
                event_type="booking_failed",
                status="failed",
                source="calcom",
                phone_number=call.customer.number if call and call.customer else None,
                message="Booking tool failed because the organization could not be resolved.",
                error=result["message"],
                metadata={"tool": tc.function.name, "vapi_call_id": call.id if call else None},
            )
        elif tc.function.name == "check_availability":
            result = await calcom_service.check_availability(organization, tc.function.arguments)
        elif tc.function.name == "book_appointment":
            await automation_events.log_automation_event(
                org_id=org_id,
                event_type="booking_attempted",
                status="info",
                source="calcom",
                phone_number=call.customer.number if call and call.customer else None,
                message="Booking attempted from voice call.",
                metadata={"tool": tc.function.name, "vapi_call_id": call.id if call else None},
            )
            result = await calcom_service.create_booking(
                organization,
                tc.function.arguments,
                call.id if call else None,
            )
            if isinstance(result, dict) and result.get("ok") and org_id:
                await _store_booking_result(call, org_id, result)
                await automation_events.log_automation_event(
                    org_id=org_id,
                    event_type="booking_succeeded",
                    status="success",
                    source="calcom",
                    phone_number=call.customer.number if call and call.customer else None,
                    message="Booking succeeded.",
                    metadata={"tool": tc.function.name, "vapi_call_id": call.id if call else None, "result": result},
                )
            elif isinstance(result, dict):
                is_disabled = organization is not None and not organization.get("booking_enabled")
                await automation_events.log_automation_event(
                    org_id=org_id,
                    event_type="booking_failed",
                    status="skipped" if is_disabled else "failed",
                    source="calcom",
                    phone_number=call.customer.number if call and call.customer else None,
                    message=(
                        "Booking skipped because booking is disabled."
                        if is_disabled
                        else "Booking failed."
                    ),
                    error=result.get("message"),
                    metadata={"tool": tc.function.name, "vapi_call_id": call.id if call else None, "result": result},
                )
        elif tc.function.name in {"transfer_call", "transferCall", "human_transfer"}:
            await automation_events.log_automation_event(
                org_id=org_id,
                event_type="human_transfer_requested",
                status="info",
                source="vapi",
                phone_number=call.customer.number if call and call.customer else None,
                message="Human transfer requested by the voice agent.",
                metadata={"tool": tc.function.name, "vapi_call_id": call.id if call else None},
            )
            result = {
                "ok": False,
                "message": "Human transfer is not available yet. Please collect the caller's details for follow-up.",
            }
            await automation_events.log_automation_event(
                org_id=org_id,
                event_type="human_transfer_unavailable",
                status="skipped",
                source="vapi",
                phone_number=call.customer.number if call and call.customer else None,
                message="Human transfer unavailable.",
                error=result["message"],
                metadata={"tool": tc.function.name, "vapi_call_id": call.id if call else None},
            )
        else:
            result = "Fonction non supportee"
        results.append({"toolCallId": tc.id, "result": result})
    return {"results": results}


# ── Endpoint ─────────────────────────────────────────────────


@router.post("/webhooks/vapi")
async def vapi_webhook(
    payload: VapiWebhookPayload,
    x_vapi_secret: Annotated[str | None, Header()] = None,
) -> dict:
    """Receive and process Vapi server-side webhook events.

    Always returns HTTP 200 to prevent Vapi retry storms.
    Internal errors are logged but do not surface as HTTP errors.
    """
    _verify_secret(x_vapi_secret)
    msg = payload.message

    try:
        match msg.type:
            case "end-of-call-report":
                await _handle_end_of_call_report(msg.call, msg.artifact)
                return {"received": True}
            case "status-update":
                await _handle_status_update(msg.call)
                return {"received": True}
            case "assistant-request":
                return await _handle_assistant_request(msg.call)
            case "tool-calls":
                return await _handle_tool_calls(msg.call, msg.tool_call_list)
            case _:
                return {"received": True}
    except Exception as exc:
        logger.error("Vapi webhook error [%s]: %s", msg.type, exc)
        return {"received": True}  # always 200 to Vapi
