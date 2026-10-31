import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { isAdminUserId } from "@/lib/admin";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!isAdminUserId(userId)) redirect("/");

  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50 via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-black">
      <AppHeader
        title="Observability"
        subtitle="Metrics · evals · traces · replay"
        active="dashboard"
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <DashboardClient />
      </main>
    </div>
  );
}
