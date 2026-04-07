-- ============================================================
-- PlainVoice — Session 4: Align voice_agents with build guide
-- Rename vapi_agent_id → vapi_assistant_id, fix status enum,
-- add missing columns: vertical, voice_provider,
-- transfer_phone_number, max_call_duration_minutes, knowledge_base
-- ============================================================

-- ── Rename vapi_agent_id → vapi_assistant_id ─────────────────
ALTER TABLE voice_agents RENAME COLUMN vapi_agent_id TO vapi_assistant_id;

-- ── Fix status enum: active/inactive/draft → draft/active/paused
ALTER TABLE voice_agents DROP CONSTRAINT voice_agents_status_check;
UPDATE voice_agents SET status = 'paused' WHERE status = 'inactive';
ALTER TABLE voice_agents ADD CONSTRAINT voice_agents_status_check
  CHECK (status IN ('draft', 'active', 'paused'));

-- ── Fix language default ─────────────────────────────────────
ALTER TABLE voice_agents ALTER COLUMN language SET DEFAULT 'fr';

-- ── Add missing columns ─────────────────────────────────────
ALTER TABLE voice_agents
  ADD COLUMN vertical text NOT NULL DEFAULT 'general'
    CHECK (vertical IN ('dental', 'plumbing', 'hvac', 'beauty', 'trades', 'restaurant', 'legal', 'general')),
  ADD COLUMN voice_provider text NOT NULL DEFAULT 'elevenlabs'
    CHECK (voice_provider IN ('elevenlabs', 'azure', 'deepgram')),
  ADD COLUMN transfer_phone_number text,
  ADD COLUMN max_call_duration_minutes integer NOT NULL DEFAULT 10
    CHECK (max_call_duration_minutes BETWEEN 5 AND 20),
  ADD COLUMN knowledge_base jsonb NOT NULL DEFAULT '[]';
