"""Controlled workflow recipe execution for PlainVoice.

Recipes are intentionally small and non-throwing so they never interrupt the
primary webhook path.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings
from app.dependencies import get_supabase
from app.services import automation_events

logger = logging.getLogger(__name__)

SUPABASE_URL = settings.next_public_supabase_url


async def _get_recipe_settings(org_id: str) -> dict[str, Any]:
    headers = get_supabase()
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/organizations",
            params={
                "id": f"eq.{org_id}",
                "select": "workflow_recipes",
                "limit": "1",
            },
            headers=headers,
            timeout=10.0,
        )
    if response.status_code != 200 or not response.json():
        return {}

    recipes = response.json()[0].get("workflow_recipes") or {}
    return recipes if isinstance(recipes, dict) else {}


def _recipe_enabled(settings: dict[str, Any], recipe_id: str) -> bool:
    value = settings.get(recipe_id)
    if isinstance(value, dict):
        return bool(value.get("enabled"))
    return bool(value)


async def _create_task(
    *,
    org_id: str,
    title: str,
    description: str | None,
    priority: str,
    call_id: str | None,
    contact_id: str | None,
    agent_id: str | None,
) -> bool:
    headers = get_supabase()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/follow_up_tasks",
            headers=headers,
            json={
                "org_id": org_id,
                "title": title,
                "description": description,
                "priority": priority,
                "call_id": call_id,
                "contact_id": contact_id,
                "agent_id": agent_id,
                "source": "automation_event",
            },
            timeout=10.0,
        )
    if response.status_code not in (200, 201):
        logger.warning("Workflow recipe task insert failed: %s", response.text)
        return False
    return True


async def execute_recipe(
    *,
    org_id: str | None,
    recipe_id: str,
    trigger: str,
    action: str,
    message: str,
    call_id: str | None = None,
    contact_id: str | None = None,
    agent_id: str | None = None,
    phone_number: str | None = None,
    metadata: dict[str, Any] | None = None,
    task_title: str | None = None,
    task_description: str | None = None,
    task_priority: str = "normal",
) -> None:
    if not org_id:
        return

    try:
        settings_payload = await _get_recipe_settings(org_id)
        if not _recipe_enabled(settings_payload, recipe_id):
            return

        task_created = False
        if task_title:
            task_created = await _create_task(
                org_id=org_id,
                title=task_title,
                description=task_description,
                priority=task_priority,
                call_id=call_id,
                contact_id=contact_id,
                agent_id=agent_id,
            )

        await automation_events.log_automation_event(
            org_id=org_id,
            event_type="workflow_recipe_executed",
            status="success" if not task_title or task_created else "failed",
            source="system",
            call_id=call_id,
            contact_id=contact_id,
            agent_id=agent_id,
            phone_number=phone_number,
            message=message,
            error=None if not task_title or task_created else "Recipe task could not be created.",
            metadata={
                "recipe_id": recipe_id,
                "trigger": trigger,
                "action": action,
                "task_created": task_created,
                **(metadata or {}),
            },
        )
    except Exception as exc:
        logger.warning("Workflow recipe execution failed: %s", exc)
