"use client";

type ReplayCompareProps = {
  message: string;
  oldAnswer: string;
  newAnswer: string;
  oldAgent: string | null;
  newAgent: string;
  changed: boolean;
  newRunId: string;
  onClose: () => void;
};

export default function ReplayCompare({
  message,
  oldAnswer,
  newAnswer,
  oldAgent,
  newAgent,
  changed,
  newRunId,
  onClose,
}: ReplayCompareProps) {
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-900 dark:bg-teal-950/20">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Replay compare
          </p>
          <p className="text-xs text-zinc-500">
            {changed ? "Answers differ" : "Answers match"} · new run{" "}
            <span className="font-mono">{newRunId.slice(0, 8)}…</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Dismiss
        </button>
      </div>

      <p className="rounded-lg bg-white/80 px-2.5 py-1.5 text-xs text-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200">
        <span className="font-medium">Input:</span> {message}
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Original {oldAgent ? `· ${oldAgent}` : ""}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-100">
            {oldAnswer || "(no stored reply)"}
          </p>
        </article>
        <article className="rounded-xl bg-white p-3 ring-1 ring-teal-200 dark:bg-zinc-900 dark:ring-teal-800">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            Replay · {newAgent}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-100">
            {newAnswer || "(empty)"}
          </p>
        </article>
      </div>
    </div>
  );
}
