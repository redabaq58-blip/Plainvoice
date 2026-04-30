-- PlainVoice - Call Quality Review
-- Adds manual owner QA fields for AI-handled calls.

ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS quality_rating text NOT NULL DEFAULT 'unreviewed',
  ADD COLUMN IF NOT EXISTS issue_categories text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS quality_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS quality_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE calls
  DROP CONSTRAINT IF EXISTS calls_quality_rating_check;

ALTER TABLE calls
  ADD CONSTRAINT calls_quality_rating_check
  CHECK (quality_rating IN ('good', 'okay', 'bad', 'unreviewed'));

CREATE INDEX IF NOT EXISTS calls_org_quality_rating_idx
  ON calls(org_id, quality_rating)
  WHERE quality_rating <> 'unreviewed';

CREATE INDEX IF NOT EXISTS calls_org_quality_needs_review_idx
  ON calls(org_id, created_at DESC)
  WHERE quality_rating = 'unreviewed';

CREATE INDEX IF NOT EXISTS calls_org_issue_categories_idx
  ON calls USING gin(issue_categories);
