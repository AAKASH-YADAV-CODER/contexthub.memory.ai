"use client";

import AppHeader from "@/components/AppHeader";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type DocRow = {
  id: string;
  title: string;
  chunk_index: number;
  source: string | null;
  created_at: string;
};

export default function UploadPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocRow[] | null>(null);
  const [docsError, setDocsError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setExtracting(true);
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

      setTitle(data.title);
      setContent(data.content);
      setFilename(data.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extract failed");
    } finally {
      setExtracting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          source: filename ?? title.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save document");
      }

      resetForm();
      const params = new URLSearchParams({
        uploaded: data.title,
        chunks: String(data.chunkCount ?? 0),
      });
      router.push(`/?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setLoading(false);
    }
  };

  const busy = loading || extracting;

  const uniqueTitles = docs
    ? [...new Set(docs.map((d) => d.title))]
    : [];

  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50 via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-black">
      <AppHeader
        title="Upload knowledge"
        subtitle="Drop a file — we chunk, embed, and store it for RAG"
        active="upload"
      />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8">
        <section className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-900/70 dark:ring-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Your team documents
          </h2>
          {docs === null && (
            <p className="mt-3 text-sm text-zinc-500">Loading documents...</p>
          )}
          {docsError && (
            <p className="mt-3 text-sm text-red-600">{docsError}</p>
          )}
          {docs && docs.length === 0 && !docsError && (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                No documents yet — upload one
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Drop a PDF, DOCX, or Markdown file below to get started.
              </p>
            </div>
          )}
          {uniqueTitles.length > 0 && (
            <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
              {uniqueTitles.slice(0, 8).map((docTitle) => {
                const count = docs!.filter((d) => d.title === docTitle).length;
                return (
                  <li
                    key={docTitle}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="truncate font-medium text-zinc-800 dark:text-zinc-100">
                      {docTitle}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {count} chunk{count === 1 ? "" : "s"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void handleFiles(e.dataTransfer.files);
            }}
            className={`rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
              dragOver
                ? "border-teal-600 bg-teal-50 dark:bg-teal-950/30"
                : "border-zinc-300 bg-white/80 dark:border-zinc-700 dark:bg-zinc-900/70"
            }`}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-xl dark:bg-zinc-800">
              ↑
            </div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {extracting ? "Reading file..." : "Drag & drop a document here"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Supports .txt, .md, .pdf, .docx (max 10MB)
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="mt-4 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
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
          </div>

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
              Document text{" "}
              <span className="font-normal text-zinc-400">
                (preview — edit if needed)
              </span>
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

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !title.trim() || !content.trim()}
            className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {loading
              ? "Saving & embedding... (can take ~10–30s)"
              : extracting
                ? "Reading file..."
                : "Save to knowledge base"}
          </button>
        </form>
      </main>
    </div>
  );
}
