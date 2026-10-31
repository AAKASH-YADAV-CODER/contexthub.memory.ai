export type AgentType = "summary" | "research" | "unknown";
export type RunStatus = "success" | "fail" | "running";

export type AgentRunSummary = {
  runId: string;
  startedAt: string;
  endedAt: string;
  message: string;
  agent: AgentType;
  status: RunStatus;
  costUsd: number;
  latencyMs: number | null;
  toolsUsed: string[];
  stepCount: number;
  userId: string | null;
  teamId: string | null;
};

export type TimelineStep = {
  id: string;
  at: string;
  step: string;
  toolName: string;
  title: string;
  detail?: string;
  costUsd?: number;
  latencyMs?: number;
  level: "default" | "success" | "error" | "tool" | "llm";
  rawInput: unknown;
  rawOutput: unknown;
};
