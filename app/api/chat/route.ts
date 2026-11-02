import { after } from "next/server";
import {
  observe,
  propagateAttributes,
  updateActiveObservation,
} from "@langfuse/tracing";
import { streamMultiAgent } from "@/agents/stream";
import {
  getOrCreateConversation,
  getRecentMessages,
  saveMessage,
} from "@/lib/memory/conversations";
import { getUserPreferences } from "@/lib/memory/preferences";
import { flushLangfuse } from "@/lib/observability/langfuse";
import { logAgentTrace } from "@/lib/observability/traces";
import { requireUserTeam } from "@/lib/team";

export const runtime = "nodejs";
export const maxDuration = 60;

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * Streaming chat — SSE events: meta, status, token, done, error
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
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(sse(payload)));
        };

        try {
          await propagateAttributes(
            {
              traceName: "contexthub-chat",
              userId,
              sessionId: conversationId,
              tags: ["contexthub", "chat", "stream"],
              metadata: { teamId, runId, conversationId },
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
                  streaming: true,
                },
                output: { status: "started" },
                userId,
                teamId,
              });

              send({
                type: "meta",
                conversationId,
                runId,
              });

              let finalText = "";
              let finalAgent = "summary";
              let toolsUsed: string[] = [];
              let sources: string[] = [];

              for await (const event of streamMultiAgent({
                message,
                userId,
                teamId,
                runId,
                history,
                preferences,
              })) {
                if (event.type === "done") {
                  finalText = event.text;
                  finalAgent = event.agent;
                  toolsUsed = event.toolsUsed;
                  sources = event.sources;

                  const totalLatencyMs = Date.now() - pipelineStarted;

                  await saveMessage({
                    conversationId,
                    role: "assistant",
                    content: event.text,
                    metadata: {
                      agent: event.agent,
                      toolsUsed: event.toolsUsed,
                      sources: event.sources,
                      runId,
                      totalLatencyMs,
                      costUsd: event.costUsd,
                      streaming: true,
                    },
                  });

                  updateActiveObservation({
                    output: {
                      reply: event.text,
                      agent: event.agent,
                      toolsUsed: event.toolsUsed,
                      sources: event.sources,
                    },
                    metadata: {
                      teamId,
                      conversationId,
                      totalLatencyMs,
                      agent: event.agent,
                    },
                  });

                  await logAgentTrace({
                    runId,
                    step: "run_finish",
                    toolName: "chat",
                    input: { message, conversationId },
                    output: {
                      reply: event.text,
                      agent: event.agent,
                      toolsUsed: event.toolsUsed,
                      sources: event.sources,
                      totalLatencyMs,
                      streaming: true,
                    },
                    userId,
                    teamId,
                  });

                  send({
                    type: "done",
                    conversationId,
                    runId,
                    agent: event.agent,
                    toolsUsed: event.toolsUsed,
                    sources: event.sources,
                    totalLatencyMs,
                    reply: event.text,
                  });
                } else {
                  send(event);
                }
              }

              // silence unused if stream aborted early
              void finalText;
              void finalAgent;
              void toolsUsed;
              void sources;
            }
          );
        } catch (error) {
          console.error("Chat stream error:", error);
          const msg =
            error instanceof Error ? error.message : "Failed to get a reply";
          send({ type: "error", message: msg });
        } finally {
          controller.close();
          after(async () => {
            await flushLangfuse();
          });
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    after(async () => {
      await flushLangfuse();
    });

    const message =
      error instanceof Error ? error.message : "Failed to get a reply";

    const status = message === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const POST = observe(chatHandler, {
  name: "contexthub-chat",
  endOnExit: false,
});
