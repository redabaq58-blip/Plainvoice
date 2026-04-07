-- ============================================================
-- PlainVoice — Session 5 fix: add 'web' to calls direction enum
-- Initial schema only had 'inbound'|'outbound'.
-- Web SDK calls need a 'web' direction value.
-- ============================================================

ALTER TABLE calls DROP CONSTRAINT calls_direction_check;
ALTER TABLE calls ADD CONSTRAINT calls_direction_check
  CHECK (direction IN ('inbound', 'outbound', 'web'));
