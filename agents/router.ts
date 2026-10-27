import { google } from "@ai-sdk/google";
import type { AgentContext, AgentName } from "@/agents/types";
import { logAgentTrace } from "@/lib/observability/traces";
import { tracedGenerateText } from "@/lib/observability/traced-llm";

const ROUTER_PROMPT = `You are a router. Based on the user message, pick ONE agent:

- "research" if they need current events, external facts, news, trends, or live web information
- "summary" if they ask about internal docs, team knowledge, uploaded files, policies, or company content

Return only the agent name: research OR summary.
No punctuation, no explanation.`;

const MODEL_ID = "gemini-3.8-flash";

function normalizeRoute(raw: string): AgentName {
  const cleaned = raw.trim().toLowerCase().replace(/["'`]/g, "");
  if (cleaned.includes("research")) return "research";
  if (cleaned.includes("summary")) return "summary";

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
  const { result, latencyMs, costUsd, usage } = await tracedGenerateText({
    name: "router",
    modelId: MODEL_ID,
    args: {
      model: google(MODEL_ID),
      system: ROUTER_PROMPT,
      prompt: ctx.message,
    },
  });

  const agent = normalizeRoute(result.text);

  await logAgentTrace({
    runId: ctx.runId,
    step: "route",
    toolName: "router",
    input: { message: ctx.message, raw: result.text },
    output: { agent, latencyMs, costUsd, usage },
    userId: ctx.userId,
    teamId: ctx.teamId,
  });

  return agent;
}
