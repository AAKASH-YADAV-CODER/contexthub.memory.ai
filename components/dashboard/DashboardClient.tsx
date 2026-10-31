"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MetricsPanel from "@/components/dashboard/MetricsPanel";
import RunTimeline from "@/components/dashboard/RunTimeline";
import type {
  AgentRunSummary,
  AgentType,
  RunStatus,
  TimelineStep,
} from "@/lib/observability/run-types";

type Filters = {
  from: string;
  to: string;
  agent: AgentType | "all";
  status: RunStatus | "all";
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatMoney(n: number) {
  if (n < 0.01) return `$${n.toFixed(5)}`;
  return `$${n.toFixed(4)}`;
}

function formatLatency(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function statusBadge(status: RunStatus) {
  if (status === "success") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  }
  if (status === "running") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
  }
  return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
}

const defaultFilters = (): Filters => ({
  from: daysAgoISO(7),
  to: todayISO(),
  agent: "all",
  status: "all",
});

export default function DashboardClient() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [runs, setRuns] = useState<AgentRunSummary[]>([]);
  const [totalCostUsd, setTotalCostUsd] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [steps, setSteps] = useState<TimelineStep[]>([]);
  const [detailSummary, setDetailSummary] = useState<AgentRunSummary | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.from) p.set("from", filters.from);
    if (filters.to) p.set("to", filters.to);
    if (filters.agent !== "all") p.set("agent", filters.agent);
    if (filters.status !== "all") p.set("status", filters.status);
    return p.toString();
  }, [filters]);

  const loadRuns = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch(`/api/dashboard/runs?${queryString}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load runs");
      setRuns(data.runs ?? []);
      setTotalCostUsd(data.totalCostUsd ?? 0);
      setSelectedId((prev) => {
        const ids = (data.runs as AgentRunSummary[]).map((r) => r.runId);
        if (prev && ids.includes(prev)) return prev;
        return ids[0] ?? null;
      });
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load runs");
      setRuns([]);
    } finally {
      setListLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    if (!selectedId) {
      setSteps([]);
      setDetailSummary(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    void (async () => {
      try {
        const res = await fetch(`/api/dashboard/runs/${selectedId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load run");
        if (cancelled) return;
        setDetailSummary(data.summary);
        setSteps(data.steps ?? []);
      } catch (err) {
        if (cancelled) return;
        setDetailError(
          err instanceof Error ? err.message : "Failed to load timeline"
        );
        setSteps([]);
        setDetailSummary(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <div className="space-y-6">
      <MetricsPanel />

      <section className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/70 dark:ring-zinc-800">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Trace viewer
            </p>
            <p className="text-xs text-zinc-500">
              Filtered list · {listLoading ? "…" : `${runs.length} runs`} ·{" "}
              {listLoading ? "…" : formatMoney(totalCostUsd)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-300">
            From
            <input
              type="date"
              value={filters.from}
              onChange={(e) =>
                setFilters((f) => ({ ...f, from: e.target.value }))
              }
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-300">
            To
            <input
              type="date"
              value={filters.to}
              onChange={(e) =>
                setFilters((f) => ({ ...f, to: e.target.value }))
              }
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-300">
            Agent
            <select
              value={filters.agent}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  agent: e.target.value as Filters["agent"],
                }))
              }
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="all">All</option>
              <option value="summary">Summary</option>
              <option value="research">Research</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-300">
            Status
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: e.target.value as Filters["status"],
                }))
              }
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="fail">Fail</option>
              <option value="running">Running</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void loadRuns()}
            className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
          >
            Refresh
          </button>
        </div>
      </section>

      {listError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {listError}
        </p>
      )}

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="rounded-2xl bg-white/80 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/70 dark:ring-zinc-800">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Agent runs
            </h2>
            <p className="text-xs text-zinc-500">
              From Supabase <code className="font-mono">agent_traces</code>
            </p>
          </div>

          <div className="max-h-[calc(100dvh-22rem)] overflow-y-auto">
            {listLoading && (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                Loading runs…
              </p>
            )}
            {!listLoading && runs.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                No runs in this range. Send a chat message first.
              </p>
            )}
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {runs.map((run) => {
                const active = run.runId === selectedId;
                return (
                  <li key={run.runId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(run.runId)}
                      className={`flex w-full flex-col gap-1.5 px-4 py-3 text-left transition ${
                        active
                          ? "bg-teal-50 dark:bg-teal-950/30"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {run.message}
                        </p>
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${statusBadge(run.status)}`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                        <span>
                          {new Date(run.startedAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="capitalize">{run.agent}</span>
                        <span>{formatLatency(run.latencyMs)}</span>
                        <span className="font-medium text-teal-700 dark:text-teal-300">
                          {formatMoney(run.costUsd)}
                        </span>
                        <span>{run.stepCount} steps</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl bg-white/80 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/70 dark:ring-zinc-800">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Run timeline
            </h2>
            {detailSummary ? (
              <p className="mt-0.5 text-xs text-zinc-500">
                {detailSummary.agent} · {formatLatency(detailSummary.latencyMs)}{" "}
                · {formatMoney(detailSummary.costUsd)} ·{" "}
                <span className="font-mono">{detailSummary.runId.slice(0, 8)}…</span>
              </p>
            ) : (
              <p className="text-xs text-zinc-500">Select a run to inspect</p>
            )}
          </div>

          <div className="max-h-[calc(100dvh-22rem)] overflow-y-auto px-4 py-4">
            {detailLoading && (
              <p className="py-8 text-center text-sm text-zinc-500">
                Loading timeline…
              </p>
            )}
            {detailError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {detailError}
              </p>
            )}
            {!detailLoading && !detailError && selectedId && (
              <RunTimeline steps={steps} />
            )}
            {!selectedId && !detailLoading && (
              <p className="py-8 text-center text-sm text-zinc-500">
                Pick a run on the left to see the step cards.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
