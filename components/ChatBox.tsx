"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import BrandLogo from "@/components/BrandLogo";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  toolsUsed?: string[];
  streaming?: boolean;
};

type ConversationItem = {
  id: string;
  title: string;
  updated_at: string;
  created_at: string;
};

const CONV_KEY = "contexthub_conversation_id";

const SUGGESTIONS = [
  "What's in our uploaded docs?",
  "Summarize the latest document",
  "What's happening in AI news today?",
];

const PRESET_PREFS = [
  "User prefers short answers",
  "User works on backend team",
  "User prefers bullet points",
];

function formatChatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

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

async function readSseStream(
  res: Response,
  onEvent: (event: Record<string, unknown>) => void
) {
  if (!res.body) throw new Error("No response stream");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("data:"));
      if (!line) continue;
      const raw = line.replace(/^data:\s*/, "");
      if (!raw || raw === "[DONE]") continue;
      try {
        onEvent(JSON.parse(raw) as Record<string, unknown>);
      } catch {
        /* skip bad chunk */
      }
    }
  }
}

export default function ChatBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [prefDraft, setPrefDraft] = useState("");
  const [prefsSaving, setPrefsSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadConversations = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      /* ignore */
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadConversationMessages = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}/messages`);
    if (!res.ok) {
      throw new Error("Could not load that chat");
    }
    const data = await res.json();
    const loaded: ChatMessage[] = (data.messages ?? [])
      .filter(
        (m: { role: string }) => m.role === "user" || m.role === "assistant"
      )
      .map((m: { role: "user" | "assistant"; content: string }) => ({
        role: m.role,
        content: m.content,
      }));
    return loaded;
  }, []);

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
    void loadConversations();

    const savedId = window.localStorage.getItem(CONV_KEY);
    if (savedId) {
      setConversationId(savedId);
      void (async () => {
        try {
          const loaded = await loadConversationMessages(savedId);
          setMessages(loaded);
        } catch {
          window.localStorage.removeItem(CONV_KEY);
          setConversationId(null);
        }
      })();
    }

    void (async () => {
      try {
        const res = await fetch("/api/preferences");
        if (res.ok) {
          const data = await res.json();
          setPreferences(data.preferences ?? []);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [loadConversations, loadConversationMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, statusLine]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const startNewChat = () => {
    window.localStorage.removeItem(CONV_KEY);
    setConversationId(null);
    setMessages([]);
    setError(null);
    setStatusLine(null);
    setShowHistory(false);
  };

  const openConversation = async (id: string) => {
    if (id === conversationId || switchingId) return;
    setSwitchingId(id);
    setError(null);
    try {
      const loaded = await loadConversationMessages(id);
      setConversationId(id);
      window.localStorage.setItem(CONV_KEY, id);
      setMessages(loaded);
      setShowHistory(false);
      setShowPrefs(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open chat");
    } finally {
      setSwitchingId(null);
    }
  };

  const savePreferences = async (next: string[]) => {
    setPrefsSaving(true);
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save preferences");
      setPreferences(data.preferences ?? next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preferences save failed");
    } finally {
      setPrefsSaving(false);
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput("");
    setStatusLine("Starting…");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", content: "", streaming: true },
    ]);
    setLoading(true);
    requestAnimationFrame(resizeTextarea);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          conversationId,
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        const data = contentType.includes("application/json")
          ? await res.json()
          : { error: "Something went wrong" };
        throw new Error(data.error ?? "Something went wrong");
      }

      if (!contentType.includes("text/event-stream")) {
        throw new Error("Expected a streaming response from the server");
      }

      await readSseStream(res, (event) => {
        const type = event.type;

        if (type === "meta") {
          if (typeof event.conversationId === "string") {
            setConversationId(event.conversationId);
            window.localStorage.setItem(CONV_KEY, event.conversationId);
          }
          return;
        }

        if (type === "status") {
          const detail =
            typeof event.detail === "string"
              ? event.detail
              : typeof event.phase === "string"
                ? event.phase
                : "Working…";
          setStatusLine(detail);
          return;
        }

        if (type === "token" && typeof event.text === "string") {
          setStatusLine(null);
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = {
                ...last,
                content: last.content + event.text,
                streaming: true,
              };
            }
            return next;
          });
          return;
        }

        if (type === "done") {
          if (typeof event.conversationId === "string") {
            setConversationId(event.conversationId);
            window.localStorage.setItem(CONV_KEY, event.conversationId);
            void loadConversations();
          }
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = {
                role: "assistant",
                content:
                  typeof event.reply === "string" && event.reply
                    ? event.reply
                    : last.content,
                sources: Array.isArray(event.sources)
                  ? (event.sources as string[])
                  : [],
                toolsUsed: Array.isArray(event.toolsUsed)
                  ? (event.toolsUsed as string[])
                  : [],
                streaming: false,
              };
            }
            return next;
          });
          setStatusLine(null);
          return;
        }

        if (type === "error") {
          throw new Error(
            typeof event.message === "string"
              ? event.message
              : "Stream failed"
          );
        }
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reach the server";
      setError(message);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant" && last.streaming && !last.content) {
          next.pop();
        } else if (last?.role === "assistant" && last.streaming) {
          next[next.length - 1] = { ...last, streaming: false };
        }
        return next;
      });
    } finally {
      setLoading(false);
      setStatusLine(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const activeTitle =
    conversations.find((c) => c.id === conversationId)?.title ??
    (conversationId ? "Current chat" : "New chat");

  const showThinkingRow =
    loading &&
    !(
      messages[messages.length - 1]?.role === "assistant" &&
      messages[messages.length - 1]?.content
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">
            {activeTitle}
          </p>
          <p className="text-[11px] text-zinc-500">
            Live streaming · session memory on
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              setShowHistory((v) => !v);
              setShowPrefs(false);
              if (!showHistory) void loadConversations();
            }}
            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            History
          </button>
          <button
            type="button"
            onClick={() => {
              setShowPrefs((v) => !v);
              setShowHistory(false);
            }}
            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Preferences
          </button>
          <button
            type="button"
            onClick={startNewChat}
            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            New chat
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="mb-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-zinc-800 dark:text-zinc-100">
              Past chats
            </p>
            <button
              type="button"
              onClick={startNewChat}
              className="text-xs font-medium text-teal-700 hover:underline dark:text-teal-300"
            >
              + New chat
            </button>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            Pick a session to resume. New chat keeps old ones in this list.
          </p>

          {historyLoading && conversations.length === 0 && (
            <p className="mt-3 text-xs text-zinc-500">Loading history…</p>
          )}

          {!historyLoading && conversations.length === 0 && (
            <p className="mt-3 text-xs text-zinc-500">
              No past chats yet — send a message to start one.
            </p>
          )}

          {conversations.length > 0 && (
            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
              {conversations.map((c) => {
                const active = c.id === conversationId;
                const busy = switchingId === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={Boolean(switchingId)}
                      onClick={() => void openConversation(c.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                        active
                          ? "bg-teal-50 text-teal-900 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-100 dark:ring-teal-800"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      } disabled:opacity-60`}
                    >
                      <span className="min-w-0 truncate text-xs font-medium">
                        {busy ? "Opening…" : c.title || "Untitled chat"}
                      </span>
                      <span className="shrink-0 text-[10px] text-zinc-500">
                        {formatChatTime(c.updated_at)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {showPrefs && (
        <div className="mb-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <p className="font-medium text-zinc-800 dark:text-zinc-100">
            Your preferences
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            The agent reads these before every reply.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESET_PREFS.map((p) => {
              const on = preferences.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  disabled={prefsSaving}
                  onClick={() => {
                    const next = on
                      ? preferences.filter((x) => x !== p)
                      : [...preferences, p];
                    void savePreferences(next);
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    on
                      ? "bg-teal-700 text-white"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const t = prefDraft.trim();
              if (!t) return;
              setPrefDraft("");
              void savePreferences([...preferences, t]);
            }}
          >
            <input
              value={prefDraft}
              onChange={(e) => setPrefDraft(e.target.value)}
              placeholder="Add custom preference..."
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-teal-600 dark:border-zinc-600 dark:bg-zinc-950"
            />
            <button
              type="submit"
              disabled={prefsSaving || !prefDraft.trim()}
              className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Add
            </button>
          </form>
          {preferences.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
              {preferences.map((p) => (
                <li key={p} className="flex justify-between gap-2">
                  <span>• {p}</span>
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={() =>
                      void savePreferences(preferences.filter((x) => x !== p))
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
              <BrandLogo size={64} className="rounded-2xl shadow-md" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              How can I help?
            </h2>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500">
              Ask about team docs or the live web. Replies stream live.{" "}
              <Link href="/upload" className="font-medium text-teal-700 underline">
                Upload
              </Link>{" "}
              or open{" "}
              <button
                type="button"
                onClick={() => {
                  setShowHistory(true);
                  void loadConversations();
                }}
                className="font-medium text-teal-700 underline"
              >
                History
              </button>
              .
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void sendMessage(s)}
                  className="rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-left text-xs text-zinc-700 shadow-sm transition hover:border-teal-600 hover:text-teal-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
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
              className={`max-w-[min(80%,36rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                msg.role === "user"
                  ? "rounded-tr-md bg-teal-700 text-white"
                  : "rounded-tl-md bg-white text-zinc-900 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-700"
              }`}
            >
              <p className="whitespace-pre-wrap">
                {msg.content}
                {msg.streaming && msg.content && (
                  <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-teal-600 align-text-bottom" />
                )}
              </p>
              {msg.role === "assistant" &&
                !msg.streaming &&
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
                !msg.streaming &&
                msg.sources &&
                msg.sources.length > 0 && (
                  <p className="mt-2 border-t border-zinc-200 pt-2 text-xs text-zinc-500 dark:border-zinc-700">
                    Sources: {msg.sources.join(", ")}
                  </p>
                )}
            </div>
          </div>
        ))}

        {showThinkingRow && (
          <div className="flex gap-2.5">
            <Avatar role="assistant" />
            <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm text-zinc-500 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700">
              <span className="inline-flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600" />
                </span>
                {statusLine ?? "Thinking…"}
              </span>
            </div>
          </div>
        )}

        {loading && statusLine && !showThinkingRow && (
          <p className="pl-10 text-[11px] text-zinc-500">{statusLine}</p>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-zinc-200 bg-zinc-50/90 pt-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        {error && (
          <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value);
              requestAnimationFrame(resizeTextarea);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder="Ask about your docs or the web…"
            disabled={loading}
            className="max-h-40 min-h-[48px] flex-1 resize-none rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-50"
          >
            {loading ? "…" : "Send"}
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-zinc-400">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}
