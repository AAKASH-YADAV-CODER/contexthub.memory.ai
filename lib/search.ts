import { createEmbedding } from "@/lib/embeddings";
import { supabase } from "@/lib/supabase/server";

export type SearchResult = {
  id: string;
  title: string;
  content: string;
  source: string | null;
  chunk_index: number;
  distance: number;
};

/**
 * Embed the question, then find the nearest document chunks in Supabase.
 * Pass teamId to scope results to one team (Week 3).
 */
export async function searchSimilarChunks(
  question: string,
  matchCount = 5,
  teamId?: string
): Promise<SearchResult[]> {
  const queryEmbedding = await createEmbedding(question, "RETRIEVAL_QUERY");

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_team_id: teamId ?? null,
  });

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  return (data ?? []) as SearchResult[];
}
