-- ============================================================================
-- PHASE 4 SCHEMA — Learning loop / distilled playbook
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_playbook (
  agent_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  guidance JSONB NOT NULL,          -- array of distilled guidance strings
  lesson_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (agent_name, task_type)
);

CREATE INDEX IF NOT EXISTS idx_playbook_lookup ON agent_playbook(agent_name, task_type);
