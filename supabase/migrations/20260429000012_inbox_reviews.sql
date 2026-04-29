-- ============================================================
-- PlainVoice - Business Inbox review state
-- Keeps inbox items derived from existing tables while allowing owners
-- to mark derived items reviewed/done.
-- ============================================================

CREATE TABLE inbox_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_type text NOT NULL CHECK (
    item_type IN ('automation_event', 'call', 'contact')
  ),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, item_key)
);

CREATE INDEX inbox_reviews_org_id_reviewed_at_idx
  ON inbox_reviews(org_id, reviewed_at DESC);

ALTER TABLE inbox_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbox_reviews_select" ON inbox_reviews
  FOR SELECT TO authenticated
  USING (org_id = any(get_user_org_ids()));

CREATE POLICY "inbox_reviews_insert" ON inbox_reviews
  FOR INSERT TO authenticated
  WITH CHECK (org_id = any(get_user_org_ids()));

CREATE POLICY "inbox_reviews_update" ON inbox_reviews
  FOR UPDATE TO authenticated
  USING (org_id = any(get_user_org_ids()))
  WITH CHECK (org_id = any(get_user_org_ids()));
