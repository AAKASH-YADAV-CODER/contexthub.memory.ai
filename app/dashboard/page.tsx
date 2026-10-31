import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { adminGateOpen, isAdminUserId } from "@/lib/admin";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!isAdminUserId(userId)) {
    return (
      <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
        <AppHeader
          title="Dashboard"
          subtitle="Observability — admin only"
          active="dashboard"
        />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16 text-center">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Access denied
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Your Clerk user ID is not in{" "}
            <code className="font-mono text-xs">ADMIN_USER_IDS</code>. Add it to
            <code className="font-mono text-xs"> .env.local</code> to open the
            trace viewer.
          </p>
          <p className="mt-4 break-all rounded-xl bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {userId}
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50 via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-black">
      <AppHeader
        title="Observability"
        subtitle="Agent run traces · cost · timeline"
        active="dashboard"
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <DashboardClient adminOpenAccess={adminGateOpen()} />
      </main>
    </div>
  );
}
