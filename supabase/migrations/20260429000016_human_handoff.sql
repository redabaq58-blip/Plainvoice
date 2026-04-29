-- PlainVoice - Human Handoff
-- Adds organization-level handoff settings and minimal call tracking.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS handoff_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS handoff_phone_number text,
  ADD COLUMN IF NOT EXISTS urgent_handoff_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS handoff_fallback_message text;

ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS handoff_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS handoff_status text,
  ADD COLUMN IF NOT EXISTS handoff_notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'calls_handoff_status_check'
  ) THEN
    ALTER TABLE calls
      ADD CONSTRAINT calls_handoff_status_check
      CHECK (
        handoff_status IS NULL OR handoff_status IN (
          'requested',
          'completed',
          'failed',
          'unavailable'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS calls_org_handoff_requested_idx
  ON calls(org_id, handoff_requested)
  WHERE handoff_requested = true;
