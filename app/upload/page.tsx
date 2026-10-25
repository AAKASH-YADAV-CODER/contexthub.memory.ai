"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useRef, useState } from "react";

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setExtracting(true);
    setError(null);
    setSuccess(null);

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
    setSuccess(null);

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

      setSuccess(
        `Saved “${data.title}” as ${data.chunkCount} chunk(s) with embeddings.`
      );
      setTitle("");
      setContent("");
      setFilename(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || extracting;

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="shrink-0 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Upload knowledge
            </h1>
            <p className="text-sm text-zinc-500">
              Drop a file or paste text — we chunk, embed, and store it
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-teal-700 hover:underline"
            >
              ← Chat
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
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
            className={`rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragOver
                ? "border-teal-600 bg-teal-50 dark:bg-teal-950/30"
                : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            }`}
          >
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {extracting
                ? "Reading file..."
                : "Drag & drop a document here"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Supports .txt, .md, .pdf, .docx (max 10MB)
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="mt-4 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
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
              <p className="mt-3 text-xs text-teal-700 dark:text-teal-300">
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
              rows={12}
              className="resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-600 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !title.trim() || !content.trim()}
            className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading
              ? "Saving & embedding..."
              : extracting
                ? "Reading file..."
                : "Save to knowledge base"}
          </button>
        </form>
      </main>
    </div>
  );
}
