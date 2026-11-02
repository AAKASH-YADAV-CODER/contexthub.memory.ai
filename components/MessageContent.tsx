"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const TOOL_LABELS: Record<string, string> = {
  searchMemory: "Memory search",
  webSearch: "Web search",
};

type MessageContentProps = {
  content: string;
  streaming?: boolean;
  toolsUsed?: string[];
  sources?: string[];
};

export default function MessageContent({
  content,
  streaming,
  toolsUsed,
  sources,
}: MessageContentProps) {
  return (
    <div className="min-w-0">
      <div className="chat-md text-[15px] leading-7 text-zinc-800 dark:text-zinc-100">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p className="mb-2.5 last:mb-0">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-zinc-950 dark:text-white">
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic text-zinc-700 dark:text-zinc-200">
                {children}
              </em>
            ),
            ul: ({ children }) => (
              <ul className="my-2.5 list-disc space-y-1.5 pl-5 marker:text-zinc-400">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="my-2.5 list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-teal-700">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed text-zinc-700 dark:text-zinc-200">
                {children}
              </li>
            ),
            h1: ({ children }) => (
              <h3 className="mb-2 mt-1 text-base font-semibold tracking-tight text-zinc-950 dark:text-white">
                {children}
              </h3>
            ),
            h2: ({ children }) => (
              <h3 className="mb-2 mt-1 text-base font-semibold tracking-tight text-zinc-950 dark:text-white">
                {children}
              </h3>
            ),
            h3: ({ children }) => (
              <h3 className="mb-1.5 mt-1 text-sm font-semibold tracking-tight text-zinc-950 dark:text-white">
                {children}
              </h3>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-800 dark:text-teal-300"
              >
                {children}
              </a>
            ),
            code: ({ className, children }) => {
              const isBlock = Boolean(className);
              if (isBlock) {
                return (
                  <code className="block overflow-x-auto rounded-xl bg-zinc-950 px-3 py-2.5 font-mono text-[12px] leading-5 text-zinc-100">
                    {children}
                  </code>
                );
              }
              return (
                <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[12px] text-teal-800 dark:bg-zinc-800 dark:text-teal-200">
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="my-2.5 overflow-x-auto rounded-xl bg-zinc-950 p-0">
                {children}
              </pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="my-2.5 rounded-r-xl border-l-4 border-teal-500 bg-teal-50/70 px-3 py-2 text-zinc-700 dark:bg-teal-950/30 dark:text-zinc-200">
                {children}
              </blockquote>
            ),
            hr: () => (
              <hr className="my-3 border-zinc-200 dark:border-zinc-700" />
            ),
            table: ({ children }) => (
              <div className="my-2.5 overflow-x-auto rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-700">
                <table className="w-full min-w-[16rem] border-collapse text-left text-[13px]">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {children}
              </thead>
            ),
            th: ({ children }) => (
              <th className="px-3 py-2 font-semibold">{children}</th>
            ),
            td: ({ children }) => (
              <td className="border-t border-zinc-100 px-3 py-2 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
                {children}
              </td>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
        {streaming && content && (
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-teal-600 align-text-bottom" />
        )}
      </div>

      {!streaming && ((toolsUsed && toolsUsed.length > 0) || (sources && sources.length > 0)) && (
        <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {toolsUsed && toolsUsed.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                Used
              </span>
              {toolsUsed.map((tool) => (
                <span
                  key={tool}
                  className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800 ring-1 ring-teal-100 dark:bg-teal-950/40 dark:text-teal-200 dark:ring-teal-900"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  {TOOL_LABELS[tool] ?? tool}
                </span>
              ))}
            </div>
          )}
          {sources && sources.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                Sources
              </span>
              {sources.map((source) => (
                <span
                  key={source}
                  className="inline-flex max-w-full truncate rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700"
                  title={source}
                >
                  {source}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
