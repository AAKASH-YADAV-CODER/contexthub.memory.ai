import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { isAdminUserId } from "@/lib/admin";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!isAdminUserId(userId)) redirect("/");

  return (
    <AppShell active="dashboard">
      <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50/70 via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-black">
        <div className="border-b border-zinc-200/70 bg-white/70 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Observability
          </h1>
          <p className="text-sm text-zinc-500">
            Metrics · evals · traces · replay
          </p>
        </div>
        <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
          <DashboardClient />
        </main>
      </div>
    </AppShell>
  );
}
