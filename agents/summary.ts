import { google } from "@ai-sdk/google";
import { generateText, stepCountIs } from "ai";
import { createSearchMemoryTool } from "@/agents/tools/searchMemory";
import type { AgentContext, AgentResult } from "@/agents/types";
import { logAgentTrace } from "@/lib/observability/traces";
import { collectToolsAndSources } from "@/agents/collect";

const SUMMARY_PROMPT = `You are ContextHub's Summary Agent.

Your job: answer using the team's uploaded documents (memory / RAG).
- Always call searchMemory when the question may relate to internal docs.
- Prefer concise, clear answers grounded in retrieved chunks.
- Cite document titles when you use them.
- If memory has nothing useful, say you couldn't find it in the uploaded documents.
- Do not invent company policies.`;

/**
 * Specialist: internal docs / RAG-focused answers.
 */
export async function runSummaryAgent(
  ctx: AgentContext
): Promise<AgentResult> {
  await logAgentTrace({
    runId: ctx.runId,
    step: "agent_start",
    toolName: "summary",
    input: { message: ctx.message },
    output: { status: "started" },
    userId: ctx.userId,
    teamId: ctx.teamId,
  });

  const result = await generateText({
    model: google("gemini-3.8-flash"),
    system: SUMMARY_PROMPT,
    prompt: ctx.message,
    tools: {
      searchMemory: createSearchMemoryTool({
        teamId: ctx.teamId,
        runId: ctx.runId,
        userId: ctx.userId,
      }),
    },
    stopWhen: stepCountIs(5),
  });

  const { toolsUsed, sources } = collectToolsAndSources(result.steps);

  await logAgentTrace({
    runId: ctx.runId,
    step: "agent_finish",
    toolName: "summary",
    input: { message: ctx.message },
    output: { reply: result.text, toolsUsed, sources },
    userId: ctx.userId,
    teamId: ctx.teamId,
  });

  return {
    text: result.text,
    toolsUsed,
    sources,
    agent: "summary",
  };
}
