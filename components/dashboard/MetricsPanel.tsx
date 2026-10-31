"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardMetrics } from "@/lib/observability/metrics-types";

const TOOL_COLORS = [
  "#0f766e",
  "#0369a1",
  "#7c3aed",
  "#c2410c",
  "#4d7c0f",
  "#a16207",
  "#be123c",
  "#334155",
];

function formatMoney(n: number) {
  if (n < 0.01) return `$${n.toFixed(5)}`;
  return `$${n.toFixed(4)}`;
}

function formatLatency(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function MetricsPanel() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/metrics");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load metrics");
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  const m = metrics;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Metrics
          </h2>
          <p className="text-xs text-zinc-500">Last 7 days (UTC) · live from agent_traces</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Refresh stats
        </button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Runs today"
          value={loading || !m ? "…" : String(m.runsToday)}
        />
        <StatCard
          label="Avg latency (7d)"
          value={loading || !m ? "…" : formatLatency(m.avgLatencyMs)}
        />
        <StatCard
          label="Cost this week"
          value={loading || !m ? "…" : formatMoney(m.costThisWeekUsd)}
        />
        <StatCard
          label="Error rate (7d)"
          value={
            loading || !m
              ? "…"
              : `${m.errorRatePct}%`
          }
          hint={
            m
              ? `${m.failedRunsWeek} fail / ${m.totalRunsWeek} runs`
              : undefined
          }
        />
        <StatCard
          label="Top tool"
          value={
            loading || !m
              ? "…"
              : m.mostUsedTools[0]
                ? m.mostUsedTools[0].name
                : "—"
          }
          hint={
            m?.mostUsedTools[0]
              ? `${m.mostUsedTools[0].count} uses`
              : undefined
          }
        />
      </section>

      {!loading && m && m.mostUsedTools.length > 0 && (
        <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/70 dark:ring-zinc-800">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Most used tools
          </p>
          <div className="flex flex-wrap gap-2">
            {m.mostUsedTools.map((t) => (
              <span
                key={t.name}
                className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {t.name}{" "}
                <span className="text-zinc-500">×{t.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Runs per day">
          {loading || !m ? (
            <ChartPlaceholder />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={m.runsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="runs" name="Runs" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Cost per day (USD)">
          {loading || !m ? (
            <ChartPlaceholder />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={m.runsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${Number(v).toFixed(4)}`}
                />
                <Tooltip
                  formatter={(value) =>
                    formatMoney(typeof value === "number" ? value : Number(value))
                  }
                />
                <Line
                  type="monotone"
                  dataKey="costUsd"
                  name="Cost"
                  stroke="#0369a1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Tool usage">
          {loading || !m ? (
            <ChartPlaceholder />
          ) : m.mostUsedTools.length === 0 ? (
            <p className="flex h-[220px] items-center justify-center text-sm text-zinc-500">
              No tool calls this week
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={m.mostUsedTools} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="count" name="Uses" radius={[0, 4, 4, 0]}>
                  {m.mostUsedTools.map((_, i) => (
                    <Cell
                      key={m.mostUsedTools[i].name}
                      fill={TOOL_COLORS[i % TOOL_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Agent mix + errors">
          {loading || !m ? (
            <ChartPlaceholder />
          ) : m.totalRunsWeek === 0 ? (
            <p className="flex h-[220px] items-center justify-center text-sm text-zinc-500">
              No runs this week
            </p>
          ) : (
            <div className="grid h-[220px] grid-cols-2 gap-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={m.runsByAgent}
                    dataKey="count"
                    nameKey="agent"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label
                  >
                    {m.runsByAgent.map((_, i) => (
                      <Cell
                        key={m.runsByAgent[i].agent}
                        fill={TOOL_COLORS[i % TOOL_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={m.runsByDay.map((d) => ({
                    label: d.label,
                    errors: d.errors,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="errors"
                    name="Failed"
                    fill="#be123c"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/70 dark:ring-zinc-800">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 truncate text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/70 dark:ring-zinc-800">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      {children}
    </div>
  );
}

function ChartPlaceholder() {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-zinc-400">
      Loading chart…
    </div>
  );
}
