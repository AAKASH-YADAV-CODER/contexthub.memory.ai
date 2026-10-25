"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  toolsUsed?: string[];
};

export default function ChatBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const uploaded = searchParams.get("uploaded");
    const chunks = searchParams.get("chunks");
    if (uploaded) {
      setUploadNotice(
        `Saved “${uploaded}”${chunks ? ` (${chunks} chunks)` : ""}. Ask a question about it.`
      );
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          sources: data.sources ?? [],
          toolsUsed: data.toolsUsed ?? [],
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reach the server";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {uploadNotice && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100">
          <p>{uploadNotice}</p>
          <button
            type="button"
            onClick={() => setUploadNotice(null)}
            className="shrink-0 text-xs font-medium opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="scrollbar-hide min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-2">
        {messages.length === 0 && !loading && (
          <p className="py-12 text-center text-sm text-zinc-500">
            Ask about team docs, or current web news — the agent picks the tool.
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={`${msg.role}-${i}`}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "ml-auto bg-teal-700 text-white"
                : "mr-auto bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
            }`}
          >
            <p className="mb-1 text-xs font-medium opacity-70">
              {msg.role === "user" ? "You" : "ContextHub"}
            </p>
            <p className="whitespace-pre-wrap">{msg.content}</p>
            {msg.role === "assistant" &&
              msg.toolsUsed &&
              msg.toolsUsed.length > 0 && (
                <p className="mt-2 text-xs text-zinc-500">
                  Tools: {msg.toolsUsed.join(", ")}
                </p>
              )}
            {msg.role === "assistant" &&
              msg.sources &&
              msg.sources.length > 0 && (
                <p className="mt-1 border-t border-zinc-200 pt-2 text-xs text-zinc-500 dark:border-zinc-700">
                  Sources: {msg.sources.join(", ")}
                </p>
              )}
          </div>
        ))}

        {loading && (
          <div className="mr-auto rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-800">
            Agent is using tools...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-zinc-200 bg-zinc-50 pt-4 dark:border-zinc-800 dark:bg-zinc-950">
        {error && (
          <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={loading}
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-600 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
