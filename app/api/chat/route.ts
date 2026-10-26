import { NextResponse } from "next/server";
import { runMultiAgent } from "@/agents";
import {
  getOrCreateConversation,
  getRecentMessages,
  saveMessage,
} from "@/lib/memory/conversations";
import { getUserPreferences } from "@/lib/memory/preferences";
import { logAgentTrace } from "@/lib/observability/traces";
import { requireUserTeam } from "@/lib/team";

/**
 * Chat with short-term session memory (last 10 messages) + user preferences.
 * Routing stays silent.
 */
export async function POST(req: Request) {
  try {
    const { userId, teamId } = await requireUserTeam();
    const body = await req.json();
    const message = body.message;
    const conversationIdInput =
      typeof body.conversationId === "string" ? body.conversationId : null;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const runId = crypto.randomUUID();

    const conversationId = await getOrCreateConversation({
      conversationId: conversationIdInput,
      userId,
      teamId,
      titleHint: message,
    });

    // History BEFORE this turn (short-term memory)
    const history = await getRecentMessages(conversationId, 10);
    const preferences = await getUserPreferences(userId);

    await saveMessage({
      conversationId,
      role: "user",
      content: message,
    });

    await logAgentTrace({
      runId,
      step: "run_start",
      toolName: "chat",
      input: {
        message,
        conversationId,
        historyCount: history.length,
        preferences,
      },
      output: { status: "started" },
      userId,
      teamId,
    });

    const result = await runMultiAgent({
      message,
      userId,
      teamId,
      runId,
      history,
      preferences,
    });

    await saveMessage({
      conversationId,
      role: "assistant",
      content: result.text,
      metadata: {
        agent: result.agent,
        toolsUsed: result.toolsUsed,
        sources: result.sources,
        runId,
      },
    });

    await logAgentTrace({
      runId,
      step: "run_finish",
      toolName: "chat",
      input: { message, conversationId },
      output: {
        reply: result.text,
        agent: result.agent,
        toolsUsed: result.toolsUsed,
        sources: result.sources,
      },
      userId,
      teamId,
    });

    return NextResponse.json({
      reply: result.text,
      sources: result.sources,
      toolsUsed: result.toolsUsed,
      runId,
      agent: result.agent,
      conversationId,
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
