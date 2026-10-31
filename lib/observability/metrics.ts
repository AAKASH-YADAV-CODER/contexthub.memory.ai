import { listAgentRuns } from "@/lib/observability/runs";
import type {
  DashboardMetrics,
  DayBucket,
  ToolUsage,
} from "@/lib/observability/metrics-types";
import type { AgentRunSummary } from "@/lib/observability/run-types";

export type {
  DashboardMetrics,
  DayBucket,
  ToolUsage,
} from "@/lib/observability/metrics-types";

function dateKeyUTC(iso: string): string {
  return iso.slice(0, 10);
}

function todayKeyUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoKeyUTC(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(yyyyMmDd: string): string {
  const d = new Date(`${yyyyMmDd}T12:00:00.000Z`);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function averageLatency(runs: AgentRunSummary[]): number | null {
  const values = runs
    .map((r) => r.latencyMs)
    .filter((ms): ms is number => typeof ms === "number" && ms > 0);
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function countTools(runs: AgentRunSummary[]): ToolUsage[] {
  const counts = new Map<string, number>();
  for (const run of runs) {
    for (const tool of run.toolsUsed) {
      counts.set(tool, (counts.get(tool) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function bucketByDay(runs: AgentRunSummary[], from: string, to: string): DayBucket[] {
  const buckets = new Map<string, DayBucket>();
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const key = new Date(t).toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      label: formatDayLabel(key),
      runs: 0,
      costUsd: 0,
      errors: 0,
      avgLatencyMs: null,
    });
  }

  const latencySum = new Map<string, { sum: number; n: number }>();

  for (const run of runs) {
    const key = dateKeyUTC(run.startedAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.runs += 1;
    bucket.costUsd += run.costUsd;
    if (run.status === "fail") bucket.errors += 1;
    if (run.latencyMs != null && run.latencyMs > 0) {
      const cur = latencySum.get(key) ?? { sum: 0, n: 0 };
      cur.sum += run.latencyMs;
      cur.n += 1;
      latencySum.set(key, cur);
    }
  }

  for (const [key, { sum, n }] of latencySum) {
    const bucket = buckets.get(key);
    if (bucket && n > 0) bucket.avgLatencyMs = Math.round(sum / n);
  }

  return [...buckets.values()];
}

/** Week 10 KPIs + chart series from agent runs (last 7 UTC days). */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const today = todayKeyUTC();
  const weekStart = daysAgoKeyUTC(6); // today + 6 prior = 7 days

  const weekRuns = await listAgentRuns({
    from: weekStart,
    to: today,
    limit: 500,
  });

  const runsToday = weekRuns.filter(
    (r) => dateKeyUTC(r.startedAt) === today
  ).length;

  const failedRunsWeek = weekRuns.filter((r) => r.status === "fail").length;
  const totalRunsWeek = weekRuns.length;
  const errorRatePct =
    totalRunsWeek === 0
      ? 0
      : Math.round((failedRunsWeek / totalRunsWeek) * 1000) / 10;

  const costThisWeekUsd = weekRuns.reduce((sum, r) => sum + r.costUsd, 0);

  const agentCounts = new Map<string, number>();
  for (const run of weekRuns) {
    agentCounts.set(run.agent, (agentCounts.get(run.agent) ?? 0) + 1);
  }

  return {
    runsToday,
    avgLatencyMs: averageLatency(weekRuns),
    costThisWeekUsd,
    errorRatePct,
    failedRunsWeek,
    totalRunsWeek,
    mostUsedTools: countTools(weekRuns),
    runsByDay: bucketByDay(weekRuns, weekStart, today),
    runsByAgent: [...agentCounts.entries()]
      .map(([agent, count]) => ({ agent, count }))
      .sort((a, b) => b.count - a.count),
  };
}
