import { routeMessage } from "@/agents/router";
import { runResearchAgent } from "@/agents/research";
import { runSummaryAgent } from "@/agents/summary";
import type { AgentContext, AgentResult } from "@/agents/types";
import { logAgentTrace } from "@/lib/observability/traces";

export type { AgentContext, AgentName, AgentResult } from "@/agents/types";
export { routeMessage } from "@/agents/router";
export { runResearchAgent } from "@/agents/research";
export { runSummaryAgent } from "@/agents/summary";

/**
 * Silent multi-agent pipeline:
 * User message → Router → Research | Summary → single reply
 * (Action agent reserved for later: emails, etc.)
 */
export async function runMultiAgent(
  ctx: AgentContext
): Promise<AgentResult> {
  const agent = await routeMessage(ctx);

  const result =
    agent === "research"
      ? await runResearchAgent(ctx)
      : await runSummaryAgent(ctx);

  await logAgentTrace({
    runId: ctx.runId,
    step: "pipeline_complete",
    toolName: "multi_agent",
    input: { message: ctx.message },
    output: {
      agent: result.agent,
      toolsUsed: result.toolsUsed,
      sources: result.sources,
    },
    userId: ctx.userId,
    teamId: ctx.teamId,
  });

  return result;
}
