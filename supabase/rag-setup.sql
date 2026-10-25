-- Run this once in Supabase → SQL Editor
-- ContextHub Week 2: chunk index + similarity search

-- 1) Ensure pgvector is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Add chunk_index if missing
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS chunk_index INTEGER NOT NULL DEFAULT 0;

-- 3) Similarity search function (cosine distance via <=> )
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_count int DEFAULT 5
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
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;
