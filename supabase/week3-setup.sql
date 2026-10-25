-- Run once in Supabase → SQL Editor (Week 3)

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scope documents to a team
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

CREATE INDEX IF NOT EXISTS documents_team_id_idx ON documents(team_id);

-- Observability: tool call traces
CREATE TABLE IF NOT EXISTS agent_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID,
  step TEXT,
  tool_name TEXT,
  input JSONB,
  output JSONB,
  user_id TEXT,
  team_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_traces_run_id_idx ON agent_traces(run_id);

-- Team-scoped similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_count int DEFAULT 5,
  filter_team_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  source text,
  chunk_index int,
  distance float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    d.id,
    d.title,
    d.content,
    d.source,
    d.chunk_index,
    (d.embedding <=> query_embedding) AS distance
  FROM documents d
  WHERE d.embedding IS NOT NULL
    AND (filter_team_id IS NULL OR d.team_id = filter_team_id)
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;
