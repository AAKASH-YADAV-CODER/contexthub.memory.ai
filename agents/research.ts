import { google } from "@ai-sdk/google";
import { stepCountIs } from "ai";
import { collectToolsAndSources } from "@/agents/collect";
import { buildChatMessages, withPreferences } from "@/agents/prompt";
import { createWebSearchTool } from "@/agents/tools/webSearch";
import type { AgentContext, AgentResult } from "@/agents/types";
import { logAgentTrace } from "@/lib/observability/traces";
import { tracedGenerateText } from "@/lib/observability/traced-llm";

const RESEARCH_PROMPT = `You are ContextHub's Research Agent.

Your job: deep-dive answers using live web information.
- Always use webSearch for current events, news, trends, or external facts.
- Synthesize clearly; include key citations when available.
- Use conversation history for follow-ups.
- Be factual and concise. Do not pretend to know private team docs.`;

const MODEL_ID = "gemini-3.8-flash";

/**
 * Specialist: web / current-events research via Perplexity.
 */
export async function runResearchAgent(
  ctx: AgentContext
): Promise<AgentResult> {
  await logAgentTrace({
    runId: ctx.runId,
    step: "agent_start",
    toolName: "research",
    input: { message: ctx.message, historyCount: ctx.history.length },
    output: { status: "started" },
    userId: ctx.userId,
    teamId: ctx.teamId,
  });

  const { result, latencyMs, costUsd, usage } = await tracedGenerateText({
    name: "research-agent",
    modelId: MODEL_ID,
    args: {
      model: google(MODEL_ID),
      system: withPreferences(RESEARCH_PROMPT, ctx.preferences),
      messages: buildChatMessages(ctx.history, ctx.message),
      tools: {
        webSearch: createWebSearchTool({
          teamId: ctx.teamId,
          runId: ctx.runId,
          userId: ctx.userId,
        }),
      },
      stopWhen: stepCountIs(5),
    },
  });

  const { toolsUsed, sources } = collectToolsAndSources(result.steps);

  await logAgentTrace({
    runId: ctx.runId,
    step: "agent_finish",
    toolName: "research",
    input: { message: ctx.message },
    output: {
      reply: result.text,
      toolsUsed,
      sources,
      latencyMs,
      costUsd,
      usage,
    },
    userId: ctx.userId,
    teamId: ctx.teamId,
  });

  return {
    text: result.text,
    toolsUsed,
    sources,
    agent: "research",
  };
}
