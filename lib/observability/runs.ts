import { supabase } from "@/lib/supabase/server";
import type {
  AgentRunSummary,
  AgentType,
  RunStatus,
  TimelineStep,
} from "@/lib/observability/run-types";

export type {
  AgentRunSummary,
  AgentType,
  RunStatus,
  TimelineStep,
} from "@/lib/observability/run-types";

export type TraceRow = {
  id: string;
  run_id: string;
  step: string;
  tool_name: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  user_id: string | null;
  team_id: string | null;
  created_at: string;
};

export type ListRunsFilters = {
  from?: string; // ISO date YYYY-MM-DD
  to?: string;
  agent?: AgentType | "all";
  status?: RunStatus | "all";
  limit?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function extractAgent(rows: TraceRow[]): AgentType {
  for (const row of rows) {
    const out = asRecord(row.output);
    const agent = str(out?.agent);
    if (agent === "summary" || agent === "research") return agent;
  }
  for (const row of rows) {
    if (row.tool_name === "summary" || row.tool_name === "research") {
      return row.tool_name;
    }
  }
  return "unknown";
}

function extractMessage(rows: TraceRow[]): string {
  const start = rows.find((r) => r.step === "run_start");
  const msg = str(asRecord(start?.input)?.message);
  if (msg) return msg;
  const route = rows.find((r) => r.step === "route");
  return str(asRecord(route?.input)?.message) ?? "(no message)";
}

function extractCost(rows: TraceRow[]): number {
  let total = 0;
  for (const row of rows) {
    const out = asRecord(row.output);
    const c = num(out?.costUsd);
    if (c !== undefined) total += c;
  }
  return total;
}

function extractLatency(rows: TraceRow[]): number | null {
  const finish = rows.find((r) => r.step === "run_finish");
  const total = num(asRecord(finish?.output)?.totalLatencyMs);
  if (total !== undefined) return total;

  let sum = 0;
  let found = false;
  for (const row of rows) {
    const ms = num(asRecord(row.output)?.latencyMs);
    if (ms !== undefined) {
      sum += ms;
      found = true;
    }
  }
  return found ? sum : null;
}

function extractTools(rows: TraceRow[]): string[] {
  const finish = rows.find((r) => r.step === "run_finish" || r.step === "agent_finish");
  const fromOut = asRecord(finish?.output)?.toolsUsed;
  if (Array.isArray(fromOut)) {
    return fromOut.filter((t): t is string => typeof t === "string");
  }
  return [
    ...new Set(
      rows.filter((r) => r.step === "tool_call").map((r) => r.tool_name)
    ),
  ];
}

function extractStatus(rows: TraceRow[]): RunStatus {
  if (rows.some((r) => r.step === "run_finish" || r.step === "pipeline_complete")) {
    return "success";
  }
  if (rows.some((r) => r.step === "error" || str(asRecord(r.output)?.status) === "error")) {
    return "fail";
  }
  // Started but never finished — treat as fail/incomplete for filters
  if (rows.some((r) => r.step === "run_start" || r.step === "agent_start")) {
    const latest = rows[rows.length - 1];
    const ageMs = Date.now() - new Date(latest.created_at).getTime();
    if (ageMs > 2 * 60 * 1000) return "fail";
    return "running";
  }
  return "fail";
}

function summarizeRun(runId: string, rows: TraceRow[]): AgentRunSummary {
  const sorted = [...rows].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  return {
    runId,
    startedAt: sorted[0]?.created_at ?? new Date(0).toISOString(),
    endedAt: sorted[sorted.length - 1]?.created_at ?? new Date(0).toISOString(),
    message: extractMessage(sorted),
    agent: extractAgent(sorted),
    status: extractStatus(sorted),
    costUsd: extractCost(sorted),
    latencyMs: extractLatency(sorted),
    toolsUsed: extractTools(sorted),
    stepCount: sorted.length,
    userId: sorted.find((r) => r.user_id)?.user_id ?? null,
    teamId: sorted.find((r) => r.team_id)?.team_id ?? null,
  };
}

/** Human-readable timeline card for a single agent_traces row. */
export function toTimelineStep(row: TraceRow): TimelineStep {
  const input = asRecord(row.input);
  const output = asRecord(row.output);
  const costUsd = num(output?.costUsd);
  const latencyMs = num(output?.latencyMs) ?? num(output?.totalLatencyMs);

  let title = `${row.step} · ${row.tool_name}`;
  let detail: string | undefined;
  let level: TimelineStep["level"] = "default";

  switch (row.step) {
    case "run_start": {
      const message = str(input?.message) ?? "";
      title = `User asked: “${message.slice(0, 120)}${message.length > 120 ? "…" : ""}”`;
      level = "default";
      break;
    }
    case "route": {
      const agent = str(output?.agent) ?? "unknown";
      title = `Router picked: ${agent} agent`;
      detail =
        latencyMs !== undefined || costUsd !== undefined
          ? [
              latencyMs !== undefined ? `${(latencyMs / 1000).toFixed(2)}s` : null,
              costUsd !== undefined ? `$${costUsd.toFixed(5)}` : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : undefined;
      level = "llm";
      break;
    }
    case "agent_start": {
      title = `${row.tool_name} agent started`;
      level = "default";
      break;
    }
    case "tool_call": {
      title = `Tool called: ${row.tool_name}`;
      level = "tool";
      if (row.tool_name === "searchMemory") {
        const results = output?.results;
        const count = Array.isArray(results) ? results.length : undefined;
        detail =
          count !== undefined
            ? `Found ${count} chunk${count === 1 ? "" : "s"}`
            : str(input?.query)
              ? `query: ${str(input?.query)}`
              : undefined;
      } else if (row.tool_name === "webSearch") {
        detail = str(input?.query) ? `query: ${str(input?.query)}` : undefined;
      }
      if (latencyMs !== undefined) {
        detail = [detail, `${latencyMs}ms`].filter(Boolean).join(" · ");
      }
      break;
    }
    case "agent_finish": {
      const reply = str(output?.reply) ?? "";
      title = `LLM responded (${row.tool_name})`;
      detail = [
        latencyMs !== undefined ? `${(latencyMs / 1000).toFixed(2)}s` : null,
        costUsd !== undefined ? `$${costUsd.toFixed(5)}` : null,
        reply ? `“${reply.slice(0, 100)}${reply.length > 100 ? "…" : ""}”` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      level = "llm";
      break;
    }
    case "pipeline_complete": {
      const agent = str(output?.agent) ?? "agent";
      title = `Pipeline complete → ${agent}`;
      level = "success";
      break;
    }
    case "run_finish": {
      title = "Run finished";
      detail = [
        latencyMs !== undefined ? `total ${(latencyMs / 1000).toFixed(2)}s` : null,
        str(output?.agent) ? `agent: ${str(output?.agent)}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      level = "success";
      break;
    }
    case "error": {
      title = "Error";
      detail = str(output?.message) ?? str(output?.error) ?? "Unknown error";
      level = "error";
      break;
    }
    default:
      break;
  }

  return {
    id: row.id,
    at: row.created_at,
    step: row.step,
    toolName: row.tool_name,
    title,
    detail,
    costUsd,
    latencyMs,
    level,
    rawInput: row.input,
    rawOutput: row.output,
  };
}

export async function listAgentRuns(
  filters: ListRunsFilters = {}
): Promise<AgentRunSummary[]> {
  const limit = filters.limit ?? 80;
  let query = supabase
    .from("agent_traces")
    .select(
      "id, run_id, step, tool_name, input, output, user_id, team_id, created_at"
    )
    .not("run_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(800);

  if (filters.from) {
    query = query.gte("created_at", `${filters.from}T00:00:00.000Z`);
  }
  if (filters.to) {
    query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`List runs failed: ${error.message}`);
  }

  const byRun = new Map<string, TraceRow[]>();
  for (const row of (data ?? []) as TraceRow[]) {
    if (!row.run_id) continue;
    const list = byRun.get(row.run_id) ?? [];
    list.push(row);
    byRun.set(row.run_id, list);
  }

  let runs = [...byRun.entries()].map(([runId, rows]) =>
    summarizeRun(runId, rows)
  );

  runs.sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  if (filters.agent && filters.agent !== "all") {
    runs = runs.filter((r) => r.agent === filters.agent);
  }
  if (filters.status && filters.status !== "all") {
    runs = runs.filter((r) => r.status === filters.status);
  }

  return runs.slice(0, limit);
}

export async function getAgentRun(runId: string): Promise<{
  summary: AgentRunSummary;
  steps: TimelineStep[];
} | null> {
  const { data, error } = await supabase
    .from("agent_traces")
    .select(
      "id, run_id, step, tool_name, input, output, user_id, team_id, created_at"
    )
    .eq("run_id", runId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Load run failed: ${error.message}`);
  }
  if (!data || data.length === 0) return null;

  const rows = data as TraceRow[];
  return {
    summary: summarizeRun(runId, rows),
    steps: rows.map(toTimelineStep),
  };
}
