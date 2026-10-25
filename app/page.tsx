import { Suspense } from "react";
import AppHeader from "@/components/AppHeader";
import ChatBox from "@/components/ChatBox";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50 via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-black">
      <AppHeader
        title="ContextHub"
        subtitle="Team knowledge agent with memory + web tools"
        active="chat"
      />

      <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 py-4">
        <Suspense
          fallback={
            <p className="py-8 text-center text-sm text-zinc-500">
              Loading chat...
            </p>
          }
        >
          <ChatBox />
        </Suspense>
      </main>
    </div>
  );
}
