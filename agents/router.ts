import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { logAgentTrace } from "@/lib/observability/traces";
import type { AgentContext, AgentName } from "@/agents/types";

const ROUTER_PROMPT = `You are a router. Based on the user message, pick ONE agent:

- "research" if they need current events, external facts, news, trends, or live web information
- "summary" if they ask about internal docs, team knowledge, uploaded files, policies, or company content

Return only the agent name: research OR summary.
No punctuation, no explanation.`;

function normalizeRoute(raw: string): AgentName {
  const cleaned = raw.trim().toLowerCase().replace(/["'`]/g, "");
  if (cleaned.includes("research")) return "research";
  if (cleaned.includes("summary")) return "summary";

  // Heuristic fallback if the model drifts
  if (
    /news|trend|latest|today|this week|current|web|happening|openai|market/i.test(
      cleaned
    )
  ) {
    return "research";
  }
  return "summary";
}

/**
 * Silent boss agent: decides which specialist handles the message.
 */
export async function routeMessage(ctx: AgentContext): Promise<AgentName> {
  const { text } = await generateText({
    model: google("gemini-3.8-flash"),
    system: ROUTER_PROMPT,
    prompt: ctx.message,
  });

  const agent = normalizeRoute(text);

  await logAgentTrace({
    runId: ctx.runId,
    step: "route",
    toolName: "router",
    input: { message: ctx.message, raw: text },
    output: { agent },
    userId: ctx.userId,
    teamId: ctx.teamId,
  });

  return agent;
}
