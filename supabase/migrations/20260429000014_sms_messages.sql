-- ============================================================
-- PlainVoice - SMS History
-- Stores outbound SMS follow-up visibility without adding texting workflows.
-- ============================================================

CREATE TABLE sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient text,
  sender text,
  body text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  message_type text NOT NULL DEFAULT 'follow_up' CHECK (
    message_type IN ('follow_up', 'owner_notification', 'booking_confirmation')
  ),
  call_id uuid REFERENCES calls(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES voice_agents(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'twilio',
  provider_message_id text,
  provider_status text,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sms_messages_org_id_created_at_idx
  ON sms_messages(org_id, created_at DESC);

CREATE INDEX sms_messages_call_id_created_at_idx
  ON sms_messages(call_id, created_at DESC)
  WHERE call_id IS NOT NULL;

CREATE INDEX sms_messages_contact_id_created_at_idx
  ON sms_messages(contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;

CREATE INDEX sms_messages_org_id_recipient_created_at_idx
  ON sms_messages(org_id, recipient, created_at DESC)
  WHERE recipient IS NOT NULL;

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_messages_select" ON sms_messages
  FOR SELECT TO authenticated
  USING (org_id = any(get_user_org_ids()));

CREATE POLICY "sms_messages_insert" ON sms_messages
  FOR INSERT TO authenticated
  WITH CHECK (org_id = any(get_user_org_ids()));

CREATE POLICY "sms_messages_update" ON sms_messages
  FOR UPDATE TO authenticated
  USING (org_id = any(get_user_org_ids()))
  WITH CHECK (org_id = any(get_user_org_ids()));

CREATE POLICY "sms_messages_delete" ON sms_messages
  FOR DELETE TO authenticated
  USING (org_id = any(get_user_org_ids()));
