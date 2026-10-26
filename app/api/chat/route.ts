import { after, NextResponse } from "next/server";
import {
  observe,
  propagateAttributes,
  updateActiveObservation,
} from "@langfuse/tracing";
import { runMultiAgent } from "@/agents";
import {
  getOrCreateConversation,
  getRecentMessages,
  saveMessage,
} from "@/lib/memory/conversations";
import { getUserPreferences } from "@/lib/memory/preferences";
import { flushLangfuse } from "@/lib/observability/langfuse";
import { logAgentTrace } from "@/lib/observability/traces";
import { requireUserTeam } from "@/lib/team";

/**
 * Chat with session memory + Langfuse OTEL tracing (cost + latency on each LLM call).
 */
async function chatHandler(req: Request) {
  const pipelineStarted = Date.now();

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

    const history = await getRecentMessages(conversationId, 10);
    const preferences = await getUserPreferences(userId);

    await saveMessage({
      conversationId,
      role: "user",
      content: message,
    });

    updateActiveObservation({
      input: { message, conversationId, historyCount: history.length },
    });

    return await propagateAttributes(
      {
        traceName: "contexthub-chat",
        userId,
        sessionId: conversationId,
        tags: ["contexthub", "chat"],
        metadata: {
          teamId,
          runId,
          conversationId,
        },
      },
      async () => {
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

        const totalLatencyMs = Date.now() - pipelineStarted;

        await saveMessage({
          conversationId,
          role: "assistant",
          content: result.text,
          metadata: {
            agent: result.agent,
            toolsUsed: result.toolsUsed,
            sources: result.sources,
            runId,
            totalLatencyMs,
          },
        });

        updateActiveObservation({
          output: {
            reply: result.text,
            agent: result.agent,
            toolsUsed: result.toolsUsed,
            sources: result.sources,
          },
          metadata: {
            teamId,
            conversationId,
            totalLatencyMs,
            agent: result.agent,
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
            totalLatencyMs,
          },
          userId,
          teamId,
        });

        after(async () => {
          await flushLangfuse();
        });

        return NextResponse.json({
          reply: result.text,
          sources: result.sources,
          toolsUsed: result.toolsUsed,
          runId,
          agent: result.agent,
          conversationId,
          totalLatencyMs,
        });
      }
    );
  } catch (error) {
    console.error("Chat error:", error);
    after(async () => {
      await flushLangfuse();
    });

    const message =
      error instanceof Error ? error.message : "Failed to get a reply";

    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = observe(chatHandler, {
  name: "contexthub-chat",
  endOnExit: true,
});
