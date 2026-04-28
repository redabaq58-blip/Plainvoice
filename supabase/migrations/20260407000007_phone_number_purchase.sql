-- ============================================================
-- PlainVoice — Phone Number Purchase + Assignment
-- Add Twilio/Vapi provisioning metadata to existing phone_numbers.
-- ============================================================

ALTER TABLE phone_numbers
  ADD COLUMN IF NOT EXISTS vapi_phone_number_id text unique,
  ADD COLUMN IF NOT EXISTS capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS area_code text,
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'CA',
  ADD COLUMN IF NOT EXISTS monthly_cost numeric(10, 4),
  ADD COLUMN IF NOT EXISTS monthly_cost_currency text,
  ADD COLUMN IF NOT EXISTS provisioning_status text NOT NULL DEFAULT 'active'
    CHECK (provisioning_status IN ('active', 'vapi_error')),
  ADD COLUMN IF NOT EXISTS provisioning_error text;

CREATE INDEX IF NOT EXISTS phone_numbers_agent_id_idx ON phone_numbers(agent_id);
CREATE INDEX IF NOT EXISTS phone_numbers_provisioning_status_idx
  ON phone_numbers(org_id, provisioning_status);
