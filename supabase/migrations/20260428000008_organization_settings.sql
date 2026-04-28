-- ============================================================
-- PlainVoice - Organization Settings
-- Adds business-level defaults used by agents, calls, and future CRM flows.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS business_email text,
  ADD COLUMN IF NOT EXISTS business_phone text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Toronto',
  ADD COLUMN IF NOT EXISTS business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS default_language text NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS default_voice_provider text NOT NULL DEFAULT 'elevenlabs',
  ADD COLUMN IF NOT EXISTS default_voice_id text,
  ADD COLUMN IF NOT EXISTS default_max_call_duration_minutes integer NOT NULL DEFAULT 10;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_default_language_check'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_default_language_check
      CHECK (default_language IN ('fr', 'en', 'bilingual'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_default_voice_provider_check'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_default_voice_provider_check
      CHECK (default_voice_provider IN ('elevenlabs', 'azure', 'deepgram'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_default_max_call_duration_minutes_check'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_default_max_call_duration_minutes_check
      CHECK (default_max_call_duration_minutes BETWEEN 5 AND 20);
  END IF;
END $$;
