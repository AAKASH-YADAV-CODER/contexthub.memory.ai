import { google } from "@ai-sdk/google";
import { tracedEmbed } from "@/lib/observability/traced-llm";

/** Must match documents.embedding vector(768) */
export const EMBEDDING_DIMENSIONS = 768;

type EmbeddingTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

const MODEL_ID = "gemini-embedding-001";

/**
 * Turn text into a 768-dim vector using Gemini embeddings.
 * Use RETRIEVAL_DOCUMENT when indexing, RETRIEVAL_QUERY when searching.
 */
export async function createEmbedding(
  text: string,
  taskType: EmbeddingTask = "RETRIEVAL_DOCUMENT"
): Promise<number[]> {
  const { result } = await tracedEmbed({
    name: `embed:${taskType.toLowerCase()}`,
    modelId: MODEL_ID,
    textLength: text.length,
    args: {
      model: google.textEmbedding(MODEL_ID),
      value: text,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType,
        },
      },
    },
  });

  return result.embedding;
}
