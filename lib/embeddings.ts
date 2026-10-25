import { google } from "@ai-sdk/google";
import { embed } from "ai";

/** Must match documents.embedding vector(768) */
export const EMBEDDING_DIMENSIONS = 768;

type EmbeddingTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

/**
 * Turn text into a 768-dim vector using Gemini embeddings.
 * Use RETRIEVAL_DOCUMENT when indexing, RETRIEVAL_QUERY when searching.
 */
export async function createEmbedding(
  text: string,
  taskType: EmbeddingTask = "RETRIEVAL_DOCUMENT"
): Promise<number[]> {
  const { embedding } = await embed({
    model: google.textEmbedding("gemini-embedding-001"),
    value: text,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType,
      },
    },
  });

  return embedding;
}
