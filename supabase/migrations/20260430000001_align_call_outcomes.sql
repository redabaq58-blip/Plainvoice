-- PlainVoice - align call outcomes with the manual owner-review contract.

ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS lead_status text NOT NULL DEFAULT 'none';

UPDATE calls
SET
  outcome = CASE outcome
    WHEN 'urgent' THEN 'emergency'
    WHEN 'price_shopper' THEN 'price_question'
    WHEN 'missed_opportunity' THEN 'needs_follow_up'
    WHEN 'other' THEN NULL
    ELSE outcome
  END,
  urgency = CASE urgency
    WHEN 'high' THEN 'urgent'
    ELSE urgency
  END,
  lead_status = CASE
    WHEN outcome = 'new_lead' THEN 'new'
    WHEN outcome = 'existing_customer' THEN 'existing_customer'
    WHEN outcome = 'needs_follow_up' OR follow_up_required THEN 'needs_follow_up'
    ELSE lead_status
  END;

ALTER TABLE calls
  DROP CONSTRAINT IF EXISTS calls_outcome_check,
  DROP CONSTRAINT IF EXISTS calls_urgency_check,
  DROP CONSTRAINT IF EXISTS calls_lead_status_check;

ALTER TABLE calls
  ADD CONSTRAINT calls_outcome_check
  CHECK (
    outcome IS NULL OR outcome IN (
      'booked_appointment',
      'new_lead',
      'existing_customer',
      'needs_follow_up',
      'emergency',
      'quote_request',
      'price_question',
      'complaint',
      'spam',
      'wrong_number',
      'no_action_needed'
    )
  ),
  ADD CONSTRAINT calls_urgency_check
  CHECK (urgency IN ('low', 'normal', 'urgent')),
  ADD CONSTRAINT calls_lead_status_check
  CHECK (
    lead_status IN (
      'none',
      'new',
      'qualified',
      'unqualified',
      'existing_customer',
      'needs_follow_up'
    )
  );

CREATE INDEX IF NOT EXISTS calls_org_lead_status_idx
  ON calls(org_id, lead_status)
  WHERE lead_status <> 'none';
