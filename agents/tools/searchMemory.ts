import { tool } from "ai";
import { z } from "zod";
import { logAgentTrace } from "@/lib/observability/traces";
import { searchSimilarChunks } from "@/lib/search";

type SearchMemoryOptions = {
  teamId: string;
  runId: string;
  userId: string;
};

/**
 * Tool: search the team's uploaded documents (RAG / memory).
 */
export function createSearchMemoryTool(options: SearchMemoryOptions) {
  return tool({
    description:
      "Search the team's internal knowledge base (uploaded docs, policies, notes). Use this for questions about company/team documents, policies, or anything that may have been uploaded.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Semantic search query for the knowledge base"),
    }),
    execute: async ({ query }) => {
      const started = Date.now();
      const results = await searchSimilarChunks(query, 5, options.teamId);
      const latencyMs = Date.now() - started;

      const output = {
        results: results.map((r) => ({
          title: r.title,
          content: r.content,
          source: r.source,
          chunk_index: r.chunk_index,
          distance: r.distance,
        })),
        latencyMs,
      };

      await logAgentTrace({
        runId: options.runId,
        step: "tool_call",
        toolName: "searchMemory",
        input: { query },
        output,
        userId: options.userId,
        teamId: options.teamId,
      });

      return output;
    },
  });
}
