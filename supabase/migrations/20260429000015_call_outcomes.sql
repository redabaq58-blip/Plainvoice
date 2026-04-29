-- PlainVoice - Call Outcomes
-- Adds owner-reviewed business meaning to each call.

ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS urgency text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS follow_up_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE calls
  ADD CONSTRAINT calls_outcome_check
  CHECK (
    outcome IS NULL OR outcome IN (
      'booked_appointment',
      'new_lead',
      'existing_customer',
      'needs_follow_up',
      'urgent',
      'spam',
      'wrong_number',
      'price_shopper',
      'complaint',
      'missed_opportunity',
      'other'
    )
  );

ALTER TABLE calls
  ADD CONSTRAINT calls_urgency_check
  CHECK (urgency IN ('low', 'normal', 'high', 'urgent'));

CREATE INDEX IF NOT EXISTS calls_org_outcome_idx
  ON calls(org_id, outcome)
  WHERE outcome IS NOT NULL;

CREATE INDEX IF NOT EXISTS calls_org_follow_up_required_idx
  ON calls(org_id, follow_up_required)
  WHERE follow_up_required = true;

ALTER TABLE automation_events
  DROP CONSTRAINT automation_events_event_type_check;

ALTER TABLE automation_events
  ADD CONSTRAINT automation_events_event_type_check
  CHECK (
    event_type IN (
      'call_received',
      'call_saved',
      'transcript_saved',
      'summary_saved',
      'contact_created',
      'booking_attempted',
      'booking_succeeded',
      'booking_failed',
      'sms_attempted',
      'sms_sent',
      'sms_failed',
      'owner_notification_sent',
      'owner_notification_skipped',
      'human_transfer_requested',
      'human_transfer_unavailable',
      'call_outcome_updated'
    )
  );
