-- ============================================================
-- PlainVoice - SMS Follow-up Settings
-- Adds organization-level Twilio SMS configuration and lightweight
-- call metadata for post-call follow-up status.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_sender_phone_number_id uuid REFERENCES phone_numbers(id),
  ADD COLUMN IF NOT EXISTS sms_sender_number text,
  ADD COLUMN IF NOT EXISTS owner_notification_phone text,
  ADD COLUMN IF NOT EXISTS sms_followup_template text,
  ADD COLUMN IF NOT EXISTS sms_booking_confirmation_template text,
  ADD COLUMN IF NOT EXISTS sms_missed_call_template text;

ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS booking_result jsonb,
  ADD COLUMN IF NOT EXISTS sms_status jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS organizations_sms_sender_phone_number_id_idx
  ON organizations(sms_sender_phone_number_id);
