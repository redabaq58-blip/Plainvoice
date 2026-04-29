-- ============================================================
-- PlainVoice - Automation Events / Activity Timeline
-- Adds org-scoped automation visibility for calls, bookings, SMS, and system events.
-- ============================================================

CREATE TABLE automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
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
      'human_transfer_unavailable'
    )
  ),
  status text NOT NULL CHECK (status IN ('success', 'failed', 'skipped', 'info')),
  source text NOT NULL CHECK (source IN ('vapi', 'calcom', 'twilio', 'system')),
  call_id uuid REFERENCES calls(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES voice_agents(id) ON DELETE SET NULL,
  phone_number text,
  message text NOT NULL,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX automation_events_org_id_created_at_idx
  ON automation_events(org_id, created_at DESC);

CREATE INDEX automation_events_call_id_created_at_idx
  ON automation_events(call_id, created_at DESC)
  WHERE call_id IS NOT NULL;

ALTER TABLE automation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automation_events_select" ON automation_events
  FOR SELECT TO authenticated
  USING (org_id = any(get_user_org_ids()));

CREATE POLICY "automation_events_insert" ON automation_events
  FOR INSERT TO authenticated
  WITH CHECK (org_id = any(get_user_org_ids()));
