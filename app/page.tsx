import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import ChatBox from "@/components/ChatBox";

export default function Home() {
  return (
    <AppShell active="chat">
      <Suspense
        fallback={
          <p className="flex flex-1 items-center justify-center text-sm text-zinc-500">
            Loading chat...
          </p>
        }
      >
        <ChatBox />
      </Suspense>
    </AppShell>
  );
}
