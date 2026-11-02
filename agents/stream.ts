import { google } from "@ai-sdk/google";
import { smoothStream, stepCountIs, streamText } from "ai";
import { collectToolsAndSources } from "@/agents/collect";
import { routeMessage } from "@/agents/router";
import { buildChatMessages, withPreferences } from "@/agents/prompt";
import { createSearchMemoryTool } from "@/agents/tools/searchMemory";
import { createWebSearchTool } from "@/agents/tools/webSearch";
import type { AgentContext, AgentName } from "@/agents/types";
import { isLangfuseEnabled } from "@/lib/observability/langfuse";
import { estimateCostUsd } from "@/lib/observability/pricing";
import { logAgentTrace } from "@/lib/observability/traces";

const MODEL_ID = "gemini-3.8-flash";

const SUMMARY_PROMPT = `You are ContextHub's Summary Agent.

Your job: answer using the team's uploaded documents (memory / RAG).
- Always call searchMemory when the question may relate to internal docs.
- Prefer concise, clear answers grounded in retrieved chunks.
- Cite document titles when you use them.
- Use conversation history for follow-ups (e.g. "what about that?").
- If memory has nothing useful, say you couldn't find it in the uploaded documents.
- Do not invent company policies.`;

const RESEARCH_PROMPT = `You are ContextHub's Research Agent.

Your job: deep-dive answers using live web information.
- Always use webSearch for current events, news, trends, or external facts.
- Synthesize clearly; include key citations when available.
- Use conversation history for follow-ups.
- Be factual and concise. Do not pretend to know private team docs.`;

export type ChatStreamEvent =
  | { type: "status"; phase: string; detail?: string }
  | { type: "meta"; agent: AgentName; runId: string }
  | { type: "token"; text: string }
  | {
      type: "done";
      text: string;
      agent: AgentName;
      toolsUsed: string[];
      sources: string[];
      latencyMs: number;
      costUsd: number;
    };

/**
 * Route, then stream the specialist reply token-by-token (word-smoothed).
 */
export async function* streamMultiAgent(
  ctx: AgentContext
): AsyncGenerator<ChatStreamEvent> {
  yield { type: "status", phase: "routing", detail: "Choosing the best agent…" };

  const agent = await routeMessage(ctx);
  yield { type: "meta", agent, runId: ctx.runId };
  yield {
    type: "status",
    phase: agent === "research" ? "researching" : "searching",
    detail:
      agent === "research"
        ? "Research agent · searching the web…"
        : "Summary agent · searching your docs…",
  };

  await logAgentTrace({
    runId: ctx.runId,
    step: "agent_start",
    toolName: agent,
    input: { message: ctx.message, historyCount: ctx.history.length },
    output: { status: "started", streaming: true },
    userId: ctx.userId,
    teamId: ctx.teamId,
  });

  const started = Date.now();
  const system = withPreferences(
    agent === "research" ? RESEARCH_PROMPT : SUMMARY_PROMPT,
    ctx.preferences
  );

  const common = {
    model: google(MODEL_ID),
    system,
    messages: buildChatMessages(ctx.history, ctx.message),
    stopWhen: stepCountIs(5),
    experimental_transform: smoothStream({
      delayInMs: 12,
      chunking: "word" as const,
    }),
    experimental_telemetry: {
      isEnabled: isLangfuseEnabled(),
      functionId: `${agent}-agent-stream`,
    },
  };

  const result =
    agent === "research"
      ? streamText({
          ...common,
          tools: {
            webSearch: createWebSearchTool({
              teamId: ctx.teamId,
              runId: ctx.runId,
              userId: ctx.userId,
            }),
          },
        })
      : streamText({
          ...common,
          tools: {
            searchMemory: createSearchMemoryTool({
              teamId: ctx.teamId,
              runId: ctx.runId,
              userId: ctx.userId,
            }),
          },
        });

  let writing = false;

  for await (const part of result.fullStream) {
    if (part.type === "tool-call") {
      yield {
        type: "status",
        phase: "tool",
        detail: `Using ${part.toolName}…`,
      };
    } else if (part.type === "text-delta") {
      if (!writing) {
        writing = true;
        yield {
          type: "status",
          phase: "writing",
          detail: "Writing reply…",
        };
      }
      if (part.text) {
        yield { type: "token", text: part.text };
      }
    }
  }

  const [text, usage, steps] = await Promise.all([
    result.text,
    result.totalUsage,
    result.steps,
  ]);

  const { toolsUsed, sources } = collectToolsAndSources(steps);
  const latencyMs = Date.now() - started;
  const tokenUsage = {
    input: usage?.inputTokens ?? 0,
    output: usage?.outputTokens ?? 0,
    total: usage?.totalTokens ?? 0,
  };
  const costUsd = estimateCostUsd(MODEL_ID, tokenUsage);

  await logAgentTrace({
    runId: ctx.runId,
    step: "agent_finish",
    toolName: agent,
    input: { message: ctx.message },
    output: {
      reply: text,
      toolsUsed,
      sources,
      latencyMs,
      costUsd,
      usage: tokenUsage,
      streaming: true,
    },
    userId: ctx.userId,
    teamId: ctx.teamId,
  });

  await logAgentTrace({
    runId: ctx.runId,
    step: "pipeline_complete",
    toolName: "multi_agent",
    input: { message: ctx.message },
    output: { agent, toolsUsed, sources, streaming: true },
    userId: ctx.userId,
    teamId: ctx.teamId,
  });

  yield {
    type: "done",
    text,
    agent,
    toolsUsed,
    sources,
    latencyMs,
    costUsd,
  };
}
