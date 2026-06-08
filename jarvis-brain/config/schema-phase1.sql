-- ============================================================================
-- PHASE 1 SCHEMA — Find/Do/Log infrastructure
-- Run AFTER the base schema.sql. Adds the autonomy + learning layer.
-- ============================================================================

-- Live agent status (dashboard reads this for the "what's running" panel)
CREATE TABLE IF NOT EXISTS agent_status (
  agent_name TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'idle',  -- idle | finding | working | blocked | error
  detail TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Every task an agent actually executed (the LOG step)
CREATE TABLE IF NOT EXISTS task_executions (
  id BIGSERIAL PRIMARY KEY,
  agent_name TEXT NOT NULL,
  task_type TEXT,
  task_payload JSONB,
  result TEXT,
  outcome TEXT DEFAULT 'completed',  -- completed | failed
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons extracted after each execution (the LEARN loop)
CREATE TABLE IF NOT EXISTS agent_learning (
  id BIGSERIAL PRIMARY KEY,
  agent_name TEXT NOT NULL,
  task_type TEXT,
  lesson TEXT NOT NULL,
  execution_id BIGINT REFERENCES task_executions(id),
  confidence FLOAT DEFAULT 0.7,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- The shared work queue (agents push, dashboard approves, voice injects)
CREATE TABLE IF NOT EXISTS task_queue (
  id BIGSERIAL PRIMARY KEY,
  agent_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  payload JSONB,
  priority INT DEFAULT 5,             -- higher = sooner
  status TEXT DEFAULT 'queued',       -- queued | claimed | completed | failed | pending_approval | approved | rejected
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Daily pulse metrics (cheap heartbeat report)
CREATE TABLE IF NOT EXISTS daily_pulse (
  id BIGSERIAL PRIMARY KEY,
  executions_24h INT,
  suit_drafts_24h INT,
  scripts_24h INT,
  failures_24h INT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Columns the new agents expect on existing tables (safe to re-run)
ALTER TABLE source_ai_clients ADD COLUMN IF NOT EXISTS tier TEXT;
ALTER TABLE source_ai_clients ADD COLUMN IF NOT EXISTS scores JSONB;
ALTER TABLE source_ai_clients ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ;
ALTER TABLE source_ai_clients ADD COLUMN IF NOT EXISTS outreach_drafted TEXT;

-- Add a source column to agent_executions for voice/manual/auto provenance
ALTER TABLE agent_executions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Indexes for the hot paths
CREATE INDEX IF NOT EXISTS idx_task_queue_agent_status ON task_queue(agent_name, status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_task_executions_agent ON task_executions(agent_name, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_learning_lookup ON agent_learning(agent_name, task_type, created_at DESC);

-- Realtime: the dashboard subscribes to these
ALTER PUBLICATION supabase_realtime ADD TABLE agent_status;
ALTER PUBLICATION supabase_realtime ADD TABLE task_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE task_executions;
