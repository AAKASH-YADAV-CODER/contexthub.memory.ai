import { google } from "@ai-sdk/google";
import { generateText, stepCountIs } from "ai";
import { NextResponse } from "next/server";
import { createSearchMemoryTool } from "@/agents/tools/searchMemory";
import { createWebSearchTool } from "@/agents/tools/webSearch";
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import { logAgentTrace } from "@/lib/observability/traces";
import { requireUserTeam } from "@/lib/team";

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

    const result = await generateText({
      model: google("gemini-3.8-flash"),
      system: SYSTEM_PROMPT,
      prompt: message,
      tools: {
        searchMemory: createSearchMemoryTool({ teamId, runId, userId }),
        webSearch: createWebSearchTool({ teamId, runId, userId }),
      },
      stopWhen: stepCountIs(5),
    });

    const toolsUsed: string[] = [];
    const sources: string[] = [];

    for (const step of result.steps) {
      for (const call of step.toolCalls) {
        if (!toolsUsed.includes(call.toolName)) {
          toolsUsed.push(call.toolName);
        }
      }

      for (const toolResult of step.toolResults) {
        const output = toolResult.output as {
          results?: Array<{ title?: string }>;
          citations?: string[];
        };

        if (Array.isArray(output?.results)) {
          for (const r of output.results) {
            if (r.title && !sources.includes(r.title)) {
              sources.push(r.title);
            }
          }
        }

        if (Array.isArray(output?.citations)) {
          for (const c of output.citations.slice(0, 3)) {
            if (!sources.includes(c)) sources.push(c);
          }
        }
      }
    }

    await logAgentTrace({
      runId,
      step: "run_finish",
      toolName: "chat",
      input: { message },
      output: {
        reply: result.text,
        toolsUsed,
        sources,
      },
      userId,
      teamId,
    });

    return NextResponse.json({
      reply: result.text,
      sources,
      toolsUsed,
      runId,
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
