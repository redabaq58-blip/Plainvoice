-- ============================================================
-- PlainVoice — Session 5: Webhook schema alignment
-- Rename columns to match guide, add missing fields,
-- change calls.transcript to jsonb for structured storage.
-- ============================================================

-- ── calls: rename columns ────────────────────────────────────
ALTER TABLE calls RENAME COLUMN voice_agent_id TO agent_id;
ALTER TABLE calls RENAME COLUMN caller_number  TO from_number;

-- ── calls: add missing columns ───────────────────────────────
ALTER TABLE calls ADD COLUMN to_number    text;
ALTER TABLE calls ADD COLUMN ended_reason text;
ALTER TABLE calls ADD COLUMN credits_used integer;

-- ── calls: change transcript from text → jsonb ───────────────
-- (no production data exists; drop/re-add is safe)
ALTER TABLE calls DROP COLUMN transcript;
ALTER TABLE calls ADD COLUMN transcript jsonb;

-- ── calls: add status constraint (no prior constraint existed) ─
ALTER TABLE calls ADD CONSTRAINT calls_status_check
  CHECK (status IN ('queued', 'ringing', 'in-progress', 'completed', 'failed', 'cancelled'));

-- ── phone_numbers: rename voice_agent_id → agent_id ──────────
ALTER TABLE phone_numbers RENAME COLUMN voice_agent_id TO agent_id;

-- ── organizations: add billing usage columns ─────────────────
ALTER TABLE organizations ADD COLUMN voice_minutes_used integer NOT NULL DEFAULT 0;
ALTER TABLE organizations ADD COLUMN credits_balance    integer NOT NULL DEFAULT 0;
