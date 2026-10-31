-- Week 9 — Trace viewer indexes (optional, run in Supabase SQL Editor)

CREATE INDEX IF NOT EXISTS agent_traces_created_at_idx
  ON agent_traces (created_at DESC);

CREATE INDEX IF NOT EXISTS agent_traces_team_created_idx
  ON agent_traces (team_id, created_at DESC);
