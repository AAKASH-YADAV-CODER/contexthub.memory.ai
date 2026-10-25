import { Suspense } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import ChatBox from "@/components/ChatBox";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <header className="shrink-0 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              ContextHub
            </h1>
            <p className="text-sm text-zinc-500">
              Agent with memory + web tools
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/upload"
              className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white"
            >
              Upload docs
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 py-4">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading chat...</p>}>
          <ChatBox />
        </Suspense>
      </main>
    </div>
  );
}
