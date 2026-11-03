"use client";

import AppShell from "@/components/AppShell";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type DocRow = {
  id: string;
  title: string;
  chunk_index: number;
  source: string | null;
  created_at: string;
};

type Phase = "idle" | "reading" | "saving";

export default function UploadPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [editBeforeSave, setEditBeforeSave] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocRow[] | null>(null);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = phase !== "idle";

  const loadDocs = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load documents");
      setDocs(data.documents ?? []);
      setDocsError(null);
    } catch (err) {
      setDocsError(err instanceof Error ? err.message : "Failed to load docs");
      setDocs([]);
    }
  };

  useEffect(() => {
    void loadDocs();
  }, []);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setFilename(null);
    setError(null);
    setStatus(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const saveDocument = async (payload: {
    title: string;
    content: string;
    source: string;
  }) => {
    setPhase("saving");
    setStatus("Saving & embedding… (can take ~10–30s)");
    setError(null);

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to save document");
    }

    resetForm();
    await loadDocs();
    const params = new URLSearchParams({
      uploaded: data.title,
      chunks: String(data.chunkCount ?? 0),
    });
    router.push(`/?${params.toString()}`);
  };

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || busy) return;

    setPhase("reading");
    setStatus("Reading file…");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documents/extract", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Could not read file");
      }

      const nextTitle = String(data.title ?? file.name);
      const nextContent = String(data.content ?? "");
      const nextFilename = String(data.filename ?? file.name);

      setTitle(nextTitle);
      setContent(nextContent);
      setFilename(nextFilename);

      if (editBeforeSave) {
        setPhase("idle");
        setStatus("Preview ready — edit if needed, then save.");
        return;
      }

      // One-click path: extract → save → go to chat
      await saveDocument({
        title: nextTitle.trim(),
        content: nextContent.trim(),
        source: nextFilename,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPhase("idle");
      setStatus(null);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || busy) return;

    try {
      await saveDocument({
        title: title.trim(),
        content: content.trim(),
        source: filename ?? title.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPhase("idle");
      setStatus(null);
    }
  };

  const uniqueTitles = docs
    ? [...new Set(docs.map((d) => d.title))]
    : [];

  return (
    <AppShell active="upload">
      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50/70 via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-black">
        <aside
          className={`absolute inset-y-0 left-0 z-30 flex w-[min(18rem,88vw)] flex-col border-r border-zinc-200/80 bg-white shadow-xl transition-transform duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-900 md:static md:z-0 md:shadow-none ${
            docsOpen
              ? "translate-x-0"
              : "-translate-x-full md:w-0 md:translate-x-0 md:border-0 md:overflow-hidden"
          }`}
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Documents
              </p>
              <p className="text-[11px] text-zinc-500">
                {uniqueTitles.length} in knowledge base
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDocsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              «
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {docs === null && (
              <p className="px-2 py-4 text-sm text-zinc-500">Loading…</p>
            )}
            {docsError && (
              <p className="px-2 py-4 text-sm text-red-600">{docsError}</p>
            )}
            {docs && docs.length === 0 && !docsError && (
              <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  No documents yet
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Drop a file to get started.
                </p>
              </div>
            )}
            {uniqueTitles.length > 0 && (
              <ul className="space-y-1">
                {uniqueTitles.map((docTitle) => {
                  const count = docs!.filter((d) => d.title === docTitle).length;
                  return (
                    <li
                      key={docTitle}
                      className="rounded-xl px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    >
                      <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        {docTitle}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {count} chunk{count === 1 ? "" : "s"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {docsOpen && (
          <button
            type="button"
            aria-label="Close documents"
            className="absolute inset-0 z-20 bg-black/25 md:hidden"
            onClick={() => setDocsOpen(false)}
          />
        )}

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-200/70 bg-white/80 px-4 py-2.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
            <button
              type="button"
              onClick={() => setDocsOpen((v) => !v)}
              className={`flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition ${
                docsOpen
                  ? "border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100"
                  : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              <span aria-hidden>{docsOpen ? "«" : "☰"}</span>
              Docs
              {uniqueTitles.length > 0 && (
                <span className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
                  {uniqueTitles.length}
                </span>
              )}
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Upload knowledge
              </p>
              <p className="hidden text-[11px] text-zinc-500 sm:block">
                Drop a file — we chunk, embed, and open chat
              </p>
            </div>
          </div>

          <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6 sm:px-8">

            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={editBeforeSave}
                disabled={busy}
                onChange={(e) => setEditBeforeSave(e.target.checked)}
                className="rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
              />
              Preview & edit before saving (off = one-click auto-save)
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!busy) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void handleFiles(e.dataTransfer.files);
              }}
              className={`rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
                dragOver
                  ? "border-teal-600 bg-teal-50 dark:bg-teal-950/30"
                  : "border-zinc-300 bg-white/90 dark:border-zinc-700 dark:bg-zinc-900/70"
              }`}
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-2xl dark:bg-zinc-800">
                ↑
              </div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                {phase === "reading"
                  ? "Reading file..."
                  : phase === "saving"
                    ? "Saving & embedding..."
                    : "Drag & drop a document here"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Supports .txt, .md, .pdf, .docx (max 10MB)
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="mt-5 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              >
                Choose file
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".txt,.md,.markdown,.csv,.json,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                disabled={busy}
                onChange={(e) => void handleFiles(e.target.files)}
              />
              {filename && (
                <p className="mt-3 text-xs font-medium text-teal-700 dark:text-teal-300">
                  Loaded: {filename}
                </p>
              )}
              {status && <p className="mt-2 text-xs text-zinc-500">{status}</p>}
            </div>

            {(editBeforeSave || title || content) && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Title
                  </span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Auto-filled from filename — you can edit"
                    disabled={busy}
                    className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-600 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Document text
                  </span>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Drop a file above, or paste text here..."
                    disabled={busy}
                    rows={10}
                    className="resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-600 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </label>

                <button
                  type="submit"
                  disabled={busy || !title.trim() || !content.trim()}
                  className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  {phase === "saving"
                    ? "Saving & embedding... (can take ~10–30s)"
                    : "Save to knowledge base"}
                </button>
              </form>
            )}

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}
          </div>
        </main>
      </div>
    </AppShell>
  );
}
