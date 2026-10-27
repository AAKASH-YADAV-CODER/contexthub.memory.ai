"use client";

import type { TimelineStep } from "@/lib/observability/run-types";

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const levelStyles: Record<
  TimelineStep["level"],
  { ring: string; badge: string; label: string }
> = {
  default: {
    ring: "ring-zinc-200 dark:ring-zinc-700",
    badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    label: "step",
  },
  success: {
    ring: "ring-emerald-200 dark:ring-emerald-900",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    label: "done",
  },
  error: {
    ring: "ring-red-200 dark:ring-red-900",
    badge: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
    label: "error",
  },
  tool: {
    ring: "ring-sky-200 dark:ring-sky-900",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
    label: "tool",
  },
  llm: {
    ring: "ring-violet-200 dark:ring-violet-900",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
    label: "llm",
  },
};

export default function RunTimeline({ steps }: { steps: TimelineStep[] }) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No steps recorded for this run.</p>
    );
  }

  return (
    <ol className="relative space-y-3 border-l border-zinc-200 pl-4 dark:border-zinc-700">
      {steps.map((step) => {
        const style = levelStyles[step.level];
        return (
          <li key={step.id} className="relative">
            <span className="absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full bg-teal-600 ring-4 ring-zinc-50 dark:ring-zinc-950" />
            <article
              className={`rounded-xl bg-white p-3 shadow-sm ring-1 ${style.ring} dark:bg-zinc-900`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <time className="font-mono text-[11px] text-zinc-500">
                  [{formatTime(step.at)}]
                </time>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}
                >
                  {style.label}
                </span>
                {(step.costUsd !== undefined || step.latencyMs !== undefined) && (
                  <span className="ml-auto text-[11px] text-zinc-500">
                    {step.latencyMs !== undefined
                      ? `${(step.latencyMs / 1000).toFixed(2)}s`
                      : null}
                    {step.latencyMs !== undefined && step.costUsd !== undefined
                      ? " · "
                      : null}
                    {step.costUsd !== undefined
                      ? `$${step.costUsd.toFixed(5)}`
                      : null}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {step.title}
              </p>
              {step.detail && (
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {step.detail}
                </p>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
