-- ============================================================================
-- PHASE 3 SCHEMA — Vapi voice layer
-- ============================================================================

CREATE TABLE IF NOT EXISTS vapi_conversations (
  id BIGSERIAL PRIMARY KEY,
  caller_phone TEXT,
  transcript TEXT,
  summary TEXT,
  call_duration INT,
  ended_reason TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vapi_outbound_calls (
  id BIGSERIAL PRIMARY KEY,
  prospect_id BIGINT,
  prospect_phone TEXT,
  goal TEXT,
  first_message TEXT,
  vapi_call_id TEXT,
  status TEXT DEFAULT 'initiated',
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vapi_conversations_phone ON vapi_conversations(caller_phone, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vapi_outbound_prospect ON vapi_outbound_calls(prospect_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE vapi_conversations;
