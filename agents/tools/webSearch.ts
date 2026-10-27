import { tool } from "ai";
import { z } from "zod";
import { logAgentTrace } from "@/lib/observability/traces";

type WebSearchOptions = {
  runId: string;
  userId: string;
  teamId: string;
};

/**
 * Tool: search the live web via Perplexity (Sonar).
 */
export function createWebSearchTool(options: WebSearchOptions) {
  return tool({
    description:
      "Search the public web for current events, news, or facts not in the team's documents. Prefer searchMemory for internal company knowledge.",
    inputSchema: z.object({
      query: z.string().describe("Web search query"),
    }),
    execute: async ({ query }) => {
      const apiKey = process.env.PERPLEXITY_API_KEY;
      if (!apiKey) {
        throw new Error("PERPLEXITY_API_KEY is not set");
      }

      const started = Date.now();
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            {
              role: "system",
              content:
                "You are a concise research assistant. Answer with key facts and cite sources when possible.",
            },
            { role: "user", content: query },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Perplexity error: ${res.status} ${errText}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        citations?: string[];
      };

      const answer =
        data.choices?.[0]?.message?.content ?? "No web results found.";
      const citations = data.citations ?? [];
      const latencyMs = Date.now() - started;

      const output = { answer, citations, latencyMs };

      await logAgentTrace({
        runId: options.runId,
        step: "tool_call",
        toolName: "webSearch",
        input: { query },
        output,
        userId: options.userId,
        teamId: options.teamId,
      });

      return output;
    },
  });
}
