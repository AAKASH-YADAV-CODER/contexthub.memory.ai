"use client";

import { useCallback, useEffect, useState } from "react";

type EvalResultRow = {
  id: string;
  question: string;
  answer: string | null;
  passed: boolean;
  matched_keywords: string[] | null;
  missing_keywords: string[] | null;
  agent: string | null;
  latency_ms: number | null;
  error: string | null;
};

type EvalRunRow = {
  id: string;
  trigger: string;
  passed: number;
  failed: number;
  total: number;
  started_at: string;
  finished_at: string | null;
};

export default function EvalsPanel() {
  const [latest, setLatest] = useState<{
    run: EvalRunRow;
    results: EvalResultRow[];
  } | null>(null);
  const [history, setHistory] = useState<EvalRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/evals/results");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load evals");
      setLatest(data.latest ?? null);
      setHistory(data.history ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load evals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runSuite = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/evals/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Eval run failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eval run failed");
    } finally {
      setRunning(false);
    }
  };

  const passRate =
    latest && latest.run.total > 0
      ? Math.round((latest.run.passed / latest.run.total) * 100)
      : null;

  return (
    <section className="space-y-3 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/70 dark:ring-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Eval suite
          </h2>
          <p className="text-xs text-zinc-500">
            Keyword checks against the multi-agent pipeline (unit tests for AI)
          </p>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={() => void runSuite()}
          className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {running ? "Running evals… (1–3 min)" : "Run evals"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-sm text-zinc-500">Loading eval results…</p>
      )}

      {!loading && !latest && (
        <p className="text-sm text-zinc-500">
          No eval runs yet. Run{" "}
          <code className="font-mono text-xs">supabase/week11-setup.sql</code>{" "}
          then click <strong>Run evals</strong>.
        </p>
      )}

      {latest && (
        <>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-lg bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
              Pass rate{" "}
              <strong className="text-teal-700 dark:text-teal-300">
                {passRate}%
              </strong>
            </span>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              {latest.run.passed} passed
            </span>
            <span className="rounded-lg bg-red-50 px-2.5 py-1 text-red-800 dark:bg-red-950 dark:text-red-200">
              {latest.run.failed} failed
            </span>
            <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {latest.run.trigger} ·{" "}
              {new Date(latest.run.started_at).toLocaleString()}
            </span>
          </div>

          <ul className="max-h-72 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
            {latest.results.map((r) => (
              <li key={r.id} className="py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {r.question}
                  </p>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                      r.passed
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                    }`}
                  >
                    {r.passed ? "pass" : "fail"}
                  </span>
                </div>
                {r.answer && (
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                    {r.answer}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                  {r.agent && <span className="capitalize">{r.agent}</span>}
                  {r.latency_ms != null && <span>{(r.latency_ms / 1000).toFixed(1)}s</span>}
                  {(r.missing_keywords?.length ?? 0) > 0 && (
                    <span className="text-red-600 dark:text-red-300">
                      missing: {r.missing_keywords!.join(", ")}
                    </span>
                  )}
                  {r.error && (
                    <span className="text-red-600 dark:text-red-300">{r.error}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {history.length > 1 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Recent suites
          </p>
          <ul className="flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-300">
            {history.slice(0, 5).map((h) => (
              <li
                key={h.id}
                className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800"
              >
                {h.passed}/{h.total} · {h.trigger} ·{" "}
                {new Date(h.started_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
