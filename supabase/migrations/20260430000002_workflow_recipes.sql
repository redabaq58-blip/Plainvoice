-- PlainVoice - Workflow Recipes
-- Adds simple org-level automation recipe toggles.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS workflow_recipes jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE automation_events
  DROP CONSTRAINT automation_events_event_type_check;

ALTER TABLE automation_events
  ADD CONSTRAINT automation_events_event_type_check
  CHECK (
    event_type IN (
      'call_received',
      'call_saved',
      'transcript_saved',
      'summary_saved',
      'contact_created',
      'booking_attempted',
      'booking_succeeded',
      'booking_failed',
      'sms_attempted',
      'sms_sent',
      'sms_failed',
      'owner_notification_sent',
      'owner_notification_skipped',
      'human_transfer_requested',
      'human_transfer_unavailable',
      'call_outcome_updated',
      'workflow_recipe_executed'
    )
  );
