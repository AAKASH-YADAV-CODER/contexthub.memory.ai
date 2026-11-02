import { runMultiAgent } from "@/agents";
import { getAgentRun } from "@/lib/observability/runs";

export type ReplayCompare = {
  originalRunId: string;
  newRunId: string;
  message: string;
  oldAnswer: string;
  newAnswer: string;
  oldAgent: string | null;
  newAgent: string;
  changed: boolean;
};

function extractAnswerFromSteps(
  steps: Awaited<ReturnType<typeof getAgentRun>>
): string {
  if (!steps) return "";
  const finish = [...steps.steps]
    .reverse()
    .find((s) => s.step === "run_finish" || s.step === "agent_finish");
  const out = finish?.rawOutput;
  if (out && typeof out === "object" && "reply" in out) {
    const reply = (out as { reply?: unknown }).reply;
    if (typeof reply === "string") return reply;
  }
  return "";
}

/**
 * Re-run an agent pipeline with the same user message and compare answers.
 */
export async function replayAgentRun(params: {
  runId: string;
  userId: string;
  teamId: string;
}): Promise<ReplayCompare> {
  const original = await getAgentRun(params.runId);
  if (!original) {
    throw new Error("Original run not found");
  }

  const message = original.summary.message;
  if (!message || message === "(no message)") {
    throw new Error("Original run has no user message to replay");
  }

  const oldAnswer = extractAnswerFromSteps(original);
  const newRunId = crypto.randomUUID();

  const result = await runMultiAgent({
    message,
    userId: params.userId,
    teamId: params.teamId,
    runId: newRunId,
    history: [],
    preferences: [],
  });

  return {
    originalRunId: params.runId,
    newRunId,
    message,
    oldAnswer,
    newAnswer: result.text,
    oldAgent: original.summary.agent === "unknown" ? null : original.summary.agent,
    newAgent: result.agent,
    changed: oldAnswer.trim() !== result.text.trim(),
  };
}
