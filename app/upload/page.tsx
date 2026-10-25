"use client";

import Link from "next/link";
import { useState } from "react";

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="shrink-0 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Upload knowledge
            </h1>
            <p className="text-sm text-zinc-500">
              Paste a doc — we chunk, embed, and store it for RAG
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-teal-700 hover:underline"
          >
            ← Chat
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Company Policy"
              disabled={loading}
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
              placeholder="Paste your document here..."
              disabled={loading}
              rows={14}
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
            disabled={loading || !title.trim() || !content.trim()}
            className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Saving & embedding..." : "Save"}
          </button>
        </form>
      </main>
    </div>
  );
}
