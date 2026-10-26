import { NextResponse } from "next/server";
import { runMultiAgent } from "@/agents";
import { logAgentTrace } from "@/lib/observability/traces";
import { requireUserTeam } from "@/lib/team";

/**
 * Single chat endpoint. Routing is silent — user sees one assistant reply.
 * Router → summary | research runs in the background and is logged to agent_traces.
 */
export async function POST(req: Request) {
  try {
    const { userId, teamId } = await requireUserTeam();
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const runId = crypto.randomUUID();

    await logAgentTrace({
      runId,
      step: "run_start",
      toolName: "chat",
      input: { message },
      output: { status: "started" },
      userId,
      teamId,
    });

    const result = await runMultiAgent({
      message,
      userId,
      teamId,
      runId,
    });

    await logAgentTrace({
      runId,
      step: "run_finish",
      toolName: "chat",
      input: { message },
      output: {
        reply: result.text,
        agent: result.agent,
        toolsUsed: result.toolsUsed,
        sources: result.sources,
      },
      userId,
      teamId,
    });

    // Same shape as before — routing stays hidden from the UI
    return NextResponse.json({
      reply: result.text,
      sources: result.sources,
      toolsUsed: result.toolsUsed,
      runId,
      // Available for dashboards later; ChatBox does not display it
      agent: result.agent,
    });
  } catch (error) {
    console.error("Chat error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get a reply";

    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
