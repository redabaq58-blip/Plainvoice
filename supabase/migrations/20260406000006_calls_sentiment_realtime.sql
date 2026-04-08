-- ============================================================
-- PlainVoice — Session 6: sentiment column + realtime enrollment
-- calls.sentiment is populated by webhook/LLM in a future session.
-- Confirmed: supabase_realtime has puballtables=false, calls not enrolled.
-- ============================================================

-- Add sentiment (nullable; UI shows '—' until webhook populates it)
ALTER TABLE calls ADD COLUMN sentiment text
  CHECK (sentiment IN ('positive', 'neutral', 'negative'));

-- Enroll calls in realtime publication so Supabase Realtime broadcasts INSERTs
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
