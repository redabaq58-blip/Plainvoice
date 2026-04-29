-- ============================================================
-- PlainVoice - Follow-up Tasks
-- Turns inbox items, calls, and contacts into owner actions.
-- ============================================================

CREATE TABLE follow_up_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_at timestamptz,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  call_id uuid REFERENCES calls(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES voice_agents(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'inbox', 'contact', 'call', 'automation_event')),
  source_event_id uuid REFERENCES automation_events(id) ON DELETE SET NULL,
  created_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX follow_up_tasks_org_id_status_due_at_idx
  ON follow_up_tasks(org_id, status, due_at NULLS LAST, created_at DESC);

CREATE INDEX follow_up_tasks_contact_id_idx
  ON follow_up_tasks(contact_id)
  WHERE contact_id IS NOT NULL;

CREATE INDEX follow_up_tasks_call_id_idx
  ON follow_up_tasks(call_id)
  WHERE call_id IS NOT NULL;

CREATE TRIGGER follow_up_tasks_updated_at
  BEFORE UPDATE ON follow_up_tasks
  FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at();

ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follow_up_tasks_select" ON follow_up_tasks
  FOR SELECT TO authenticated
  USING (org_id = any(get_user_org_ids()));

CREATE POLICY "follow_up_tasks_insert" ON follow_up_tasks
  FOR INSERT TO authenticated
  WITH CHECK (org_id = any(get_user_org_ids()));

CREATE POLICY "follow_up_tasks_update" ON follow_up_tasks
  FOR UPDATE TO authenticated
  USING (org_id = any(get_user_org_ids()))
  WITH CHECK (org_id = any(get_user_org_ids()));

CREATE POLICY "follow_up_tasks_delete" ON follow_up_tasks
  FOR DELETE TO authenticated
  USING (org_id = any(get_user_org_ids()));
