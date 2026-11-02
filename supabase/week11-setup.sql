-- Week 11 — Eval cases + run results (run in Supabase SQL Editor)

CREATE TABLE IF NOT EXISTS eval_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  expected_keywords TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger TEXT NOT NULL DEFAULT 'manual',
  passed INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS eval_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_run_id UUID NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  case_id UUID REFERENCES eval_cases(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  matched_keywords TEXT[] NOT NULL DEFAULT '{}',
  missing_keywords TEXT[] NOT NULL DEFAULT '{}',
  agent TEXT,
  latency_ms INT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS eval_results_run_id_idx ON eval_results(eval_run_id);
CREATE INDEX IF NOT EXISTS eval_runs_started_at_idx ON eval_runs(started_at DESC);

-- Seed 10 starter cases (skip if table already has rows)
INSERT INTO eval_cases (question, expected_keywords)
SELECT * FROM (VALUES
  (
    'What is our vacation policy?',
    ARRAY['PTO', 'vacation', 'days']::TEXT[]
  ),
  (
    'How many PTO days do employees get?',
    ARRAY['15', 'PTO', 'days']::TEXT[]
  ),
  (
    'Summarize what is in our uploaded documents.',
    ARRAY['document', 'upload']::TEXT[]
  ),
  (
    'What is ContextHub?',
    ARRAY['knowledge', 'team', 'document']::TEXT[]
  ),
  (
    'Who should I ask about company policies?',
    ARRAY['policy', 'HR', 'team']::TEXT[]
  ),
  (
    'What remote work policy do we have?',
    ARRAY['remote', 'work', 'office']::TEXT[]
  ),
  (
    'Explain our onboarding process briefly.',
    ARRAY['onboard', 'new', 'hire']::TEXT[]
  ),
  (
    'What benefits does the company offer?',
    ARRAY['benefit', 'health', 'insurance']::TEXT[]
  ),
  (
    'What is happening in AI news this week?',
    ARRAY['AI', 'model', 'OpenAI']::TEXT[]
  ),
  (
    'Give a short overview of large language models.',
    ARRAY['language', 'model', 'LLM']::TEXT[]
  )
) AS v(question, expected_keywords)
WHERE NOT EXISTS (SELECT 1 FROM eval_cases LIMIT 1);
