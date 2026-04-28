-- PlainVoice local development seed data.
-- Keeps auth-free UI testing useful while normal auth is bypassed.

INSERT INTO organizations (id, name, slug)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'PlainVoice Demo',
  'plainvoice-demo'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = now();

INSERT INTO voice_agents (
  id,
  org_id,
  name,
  vertical,
  status,
  language,
  voice_provider,
  first_message,
  system_prompt,
  max_call_duration_minutes
)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'Demo Receptionist',
  'general',
  'active',
  'fr',
  'elevenlabs',
  'Bonjour! Merci d''appeler PlainVoice Demo. Comment puis-je vous aider?',
  'Tu es un réceptionniste virtuel de démonstration pour PlainVoice.',
  10
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  updated_at = now();
