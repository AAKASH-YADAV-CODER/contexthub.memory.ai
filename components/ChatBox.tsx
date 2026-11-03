"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import MessageContent from "@/components/MessageContent";

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
  onEvent: (event: Record<string, unknown>) => void | Promise<void>
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
        await onEvent(JSON.parse(raw) as Record<string, unknown>);
      } catch (err) {
        if (err instanceof SyntaxError) continue;
        throw err;
      }
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Split text into word-ish chunks for a typewriter reveal. */
function chunkForTypewriter(text: string): string[] {
  const parts = text.match(/\S+\s*|\s+/g);
  return parts && parts.length > 0 ? parts : [text];
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
  const [mobilePanel, setMobilePanel] = useState<"history" | "prefs" | null>(
    null
  );
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
    setMobilePanel(null);
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
      setMobilePanel(null);
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

  const appendAssistantText = (piece: string) => {
    setStatusLine(null);
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant" && last.streaming) {
        next[next.length - 1] = {
          ...last,
          content: last.content + piece,
          streaming: true,
        };
        return next;
      }
      return [
        ...next,
        { role: "assistant", content: piece, streaming: true },
      ];
    });
  };

  const typewriteText = async (text: string, delayMs = 16) => {
    for (const piece of chunkForTypewriter(text)) {
      appendAssistantText(piece);
      await sleep(delayMs);
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput("");
    setStatusLine("Starting…");
    // Only user bubble first — avoids empty + "Starting…" double UI
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);
    requestAnimationFrame(resizeTextarea);

    let receivedTokens = false;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
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

      await readSseStream(res, async (event) => {
        const type = event.type;

        if (type === "meta") {
          if (typeof event.conversationId === "string") {
            setConversationId(event.conversationId);
            window.localStorage.setItem(CONV_KEY, event.conversationId);
          }
          return;
        }

        if (type === "status") {
          if (receivedTokens) return;
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
          receivedTokens = true;
          appendAssistantText(event.text);
          // Yield so React can paint between words (even if SSE arrived buffered)
          await sleep(14);
          return;
        }

        if (type === "done") {
          if (typeof event.conversationId === "string") {
            setConversationId(event.conversationId);
            window.localStorage.setItem(CONV_KEY, event.conversationId);
            void loadConversations();
          }

          const reply =
            typeof event.reply === "string" ? event.reply : "";

          // If the network buffered and we never got tokens, type the full reply out
          if (!receivedTokens && reply) {
            await typewriteText(reply);
          }

          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = {
                role: "assistant",
                content: last.content || reply,
                sources: Array.isArray(event.sources)
                  ? (event.sources as string[])
                  : [],
                toolsUsed: Array.isArray(event.toolsUsed)
                  ? (event.toolsUsed as string[])
                  : [],
                streaming: false,
              };
            } else if (reply) {
              next.push({
                role: "assistant",
                content: reply,
                sources: Array.isArray(event.sources)
                  ? (event.sources as string[])
                  : [],
                toolsUsed: Array.isArray(event.toolsUsed)
                  ? (event.toolsUsed as string[])
                  : [],
                streaming: false,
              });
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

  const lastMsg = messages[messages.length - 1];
  const showThinkingRow =
    loading && !(lastMsg?.role === "assistant" && lastMsg.streaming);

  const historyPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-zinc-100 px-4 py-4 dark:border-zinc-800">
        <button
          type="button"
          onClick={startNewChat}
          className="w-full rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800"
        >
          + New chat
        </button>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          History
        </p>
      </div>

      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {historyLoading && conversations.length === 0 && (
          <p className="px-2 py-4 text-xs text-zinc-500">Loading…</p>
        )}
        {!historyLoading && conversations.length === 0 && (
          <p className="px-2 py-4 text-xs leading-relaxed text-zinc-500">
            No past chats yet. Send a message to start one.
          </p>
        )}
        <ul className="space-y-0.5">
          {conversations.map((c) => {
            const active = c.id === conversationId;
            const busy = switchingId === c.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={Boolean(switchingId)}
                  onClick={() => void openConversation(c.id)}
                  className={`flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition ${
                    active
                      ? "bg-teal-50 text-teal-950 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-50 dark:ring-teal-800"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  } disabled:opacity-60`}
                >
                  <span className="truncate text-sm font-medium">
                    {busy ? "Opening…" : c.title || "Untitled chat"}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {formatChatTime(c.updated_at)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  const prefsPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-zinc-100 px-4 py-4 dark:border-zinc-800">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Preferences
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          The agent follows these on every reply.
        </p>
      </div>

      <div className="scrollbar-hide min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Quick presets
          </p>
          <div className="flex flex-col gap-1.5">
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
                  className={`rounded-xl px-3 py-2 text-left text-xs transition ${
                    on
                      ? "bg-teal-700 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const t = prefDraft.trim();
            if (!t) return;
            setPrefDraft("");
            void savePreferences([...preferences, t]);
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Custom
          </p>
          <textarea
            value={prefDraft}
            onChange={(e) => setPrefDraft(e.target.value)}
            placeholder="e.g. Prefer tables over bullets"
            rows={3}
            className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="submit"
            disabled={prefsSaving || !prefDraft.trim()}
            className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add preference
          </button>
        </form>

        {preferences.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Active ({preferences.length})
            </p>
            <ul className="space-y-1.5">
              {preferences.map((p) => (
                <li
                  key={p}
                  className="flex items-start justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200"
                >
                  <span className="min-w-0 leading-relaxed">{p}</span>
                  <button
                    type="button"
                    className="shrink-0 text-red-600 hover:underline"
                    onClick={() =>
                      void savePreferences(preferences.filter((x) => x !== p))
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Session
          </p>
          <p className="mt-1 text-xs font-medium text-zinc-800 dark:text-zinc-100">
            {activeTitle}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Live streaming · memory on
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-0 flex-1">
      {/* Left: history */}
      <aside className="hidden w-72 shrink-0 border-r border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex lg:flex-col xl:w-80">
        {historyPanel}
      </aside>

      {/* Center: chat */}
      <section className="flex min-w-0 flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50/80 via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-black">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200/70 bg-white/70 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {activeTitle}
            </p>
            <p className="text-[11px] text-zinc-500">
              Team knowledge · streaming replies
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() =>
                setMobilePanel((v) => (v === "history" ? null : "history"))
              }
              className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300 lg:hidden"
            >
              History
            </button>
            <button
              type="button"
              onClick={() =>
                setMobilePanel((v) => (v === "prefs" ? null : "prefs"))
              }
              className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300 lg:hidden"
            >
              Prefs
            </button>
          </div>
        </header>

        {uploadNotice && (
          <div className="mx-4 mt-3 flex items-start justify-between gap-3 rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100">
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

        <div className="scrollbar-hide mx-auto min-h-0 w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
              <div className="mb-4">
                <BrandLogo size={72} className="rounded-2xl shadow-md" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                How can I help?
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
                Ask about team docs or the live web. History lives on the left,
                preferences on the right.{" "}
                <Link
                  href="/upload"
                  className="font-medium text-teal-700 underline"
                >
                  Upload knowledge
                </Link>
                .
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
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
                className={`max-w-[min(90%,42rem)] rounded-2xl px-4 py-3.5 shadow-sm ${
                  msg.role === "user"
                    ? "rounded-tr-md bg-teal-700 text-sm leading-relaxed text-white"
                    : "rounded-tl-md bg-white ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:ring-zinc-700"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content}
                  </p>
                ) : (
                  <MessageContent
                    content={msg.content}
                    streaming={msg.streaming}
                    toolsUsed={msg.toolsUsed}
                    sources={msg.sources}
                  />
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

        <div className="shrink-0 border-t border-zinc-200/80 bg-white/80 px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="mx-auto w-full max-w-3xl">
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
                className="max-h-40 min-h-[52px] flex-1 resize-none rounded-2xl border border-zinc-300 bg-white px-4 py-3.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-2xl bg-teal-700 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-50"
              >
                {loading ? "…" : "Send"}
              </button>
            </form>
            <p className="mt-1.5 text-center text-[10px] text-zinc-400">
              Enter to send · Shift+Enter for a new line
            </p>
          </div>
        </div>
      </section>

      {/* Right: preferences */}
      <aside className="hidden w-72 shrink-0 border-l border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex lg:flex-col xl:w-80">
        {prefsPanel}
      </aside>

      {/* Mobile drawers */}
      {mobilePanel === "history" && (
        <div className="absolute inset-0 z-20 flex lg:hidden">
          <div className="flex h-full w-[min(20rem,85vw)] flex-col bg-white shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <p className="text-sm font-semibold">History</p>
              <button
                type="button"
                onClick={() => setMobilePanel(null)}
                className="text-xs text-zinc-500"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1">{historyPanel}</div>
          </div>
          <button
            type="button"
            aria-label="Close panel"
            className="flex-1 bg-black/30"
            onClick={() => setMobilePanel(null)}
          />
        </div>
      )}
      {mobilePanel === "prefs" && (
        <div className="absolute inset-0 z-20 flex lg:hidden">
          <button
            type="button"
            aria-label="Close panel"
            className="flex-1 bg-black/30"
            onClick={() => setMobilePanel(null)}
          />
          <div className="flex h-full w-[min(20rem,85vw)] flex-col bg-white shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <p className="text-sm font-semibold">Preferences</p>
              <button
                type="button"
                onClick={() => setMobilePanel(null)}
                className="text-xs text-zinc-500"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1">{prefsPanel}</div>
          </div>
        </div>
      )}
    </div>
  );
}
