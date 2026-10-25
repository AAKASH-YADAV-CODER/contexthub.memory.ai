import ChatBox from "@/components/ChatBox";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          ContextHub
        </h1>
        <p className="text-sm text-zinc-500">
          Team knowledge assistant powered by Gemini
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <ChatBox />
      </main>
    </div>
  );
}
