"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BrandLogo from "@/components/BrandLogo";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  toolsUsed?: string[];
};

const SUGGESTIONS = [
  "What's in our uploaded docs?",
  "Summarize the latest document",
  "What's happening in AI news today?",
];

function Avatar({ role }: { role: "user" | "assistant" }) {
  if (role === "assistant") {
    return (
      <Image
        src="/logo.jpg"
        alt="ContextHub"
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-black/5"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">
      You
    </div>
  );
}

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

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
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

      <div className="scrollbar-hide min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-2">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-4">
              <BrandLogo size={64} className="rounded-2xl" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              How can I help?
            </h2>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              Ask about team docs or the live web. No documents yet?{" "}
              <Link href="/upload" className="font-medium text-teal-700 underline">
                Upload one
              </Link>
              .
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void sendMessage(s)}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-left text-xs text-zinc-700 transition hover:border-teal-600 hover:text-teal-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={`${msg.role}-${i}`}
            className={`flex gap-2.5 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <Avatar role={msg.role} />
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                msg.role === "user"
                  ? "rounded-tr-md bg-teal-700 text-white"
                  : "rounded-tl-md bg-white text-zinc-900 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-700"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.role === "assistant" &&
                msg.toolsUsed &&
                msg.toolsUsed.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.toolsUsed.map((tool) => (
                      <span
                        key={tool}
                        className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
              {msg.role === "assistant" &&
                msg.sources &&
                msg.sources.length > 0 && (
                  <p className="mt-2 border-t border-zinc-200 pt-2 text-xs text-zinc-500 dark:border-zinc-700">
                    Sources: {msg.sources.join(", ")}
                  </p>
                )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <Avatar role="assistant" />
            <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm text-zinc-500 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700">
              <span className="inline-flex items-center gap-1">
                Thinking
                <span className="animate-pulse">...</span>
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-zinc-200 bg-zinc-50/90 pt-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        {error && (
          <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your docs or the web..."
            disabled={loading}
            className="flex-1 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
