export type ToolUsage = { name: string; count: number };

export type DayBucket = {
  date: string;
  label: string;
  runs: number;
  costUsd: number;
  errors: number;
  avgLatencyMs: number | null;
};

export type DashboardMetrics = {
  runsToday: number;
  avgLatencyMs: number | null;
  costThisWeekUsd: number;
  errorRatePct: number;
  failedRunsWeek: number;
  totalRunsWeek: number;
  mostUsedTools: ToolUsage[];
  runsByDay: DayBucket[];
  runsByAgent: { agent: string; count: number }[];
};
