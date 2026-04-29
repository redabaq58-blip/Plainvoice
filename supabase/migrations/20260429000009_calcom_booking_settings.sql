-- ============================================================
-- PlainVoice - Cal.com Booking Settings
-- Adds organization-level Cal.com configuration for voice-agent booking tools.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS booking_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS calcom_api_key text,
  ADD COLUMN IF NOT EXISTS calcom_event_type_id text,
  ADD COLUMN IF NOT EXISTS calcom_username text;
