"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import BrandLogo from "@/components/BrandLogo";
import DashboardNavLink from "@/components/DashboardNavLink";

type AppShellProps = {
  active: "chat" | "upload" | "dashboard";
  children: React.ReactNode;
};

const navItems = [
  {
    href: "/",
    id: "chat" as const,
    label: "Chat",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 8h10M7 12h6" strokeLinecap="round" />
        <path d="M6 4.5h12A2.5 2.5 0 0 1 20.5 7v7A2.5 2.5 0 0 1 18 16.5H10l-4.5 3v-3H6A2.5 2.5 0 0 1 3.5 14V7A2.5 2.5 0 0 1 6 4.5Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/upload",
    id: "upload" as const,
    label: "Upload",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 16V7" strokeLinecap="round" />
        <path d="M8.5 10.5 12 7l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 19h14" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function AppShell({ active, children }: AppShellProps) {
  return (
    <div className="flex h-dvh overflow-hidden bg-white dark:bg-zinc-950">
      <aside className="flex w-44 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <Link href="/" className="flex items-center gap-2 px-4 py-4" title="ContextHub">
          <BrandLogo size={28} priority className="rounded-lg" />
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            ContextHub
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5 px-2">
          {navItems.map((item) => {
            const isActive = active === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-white font-medium text-teal-800 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-teal-200 dark:ring-zinc-700"
                    : "text-zinc-600 hover:bg-white/70 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
          <DashboardNavLink active={active === "dashboard"} variant="rail" />
        </nav>

        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <UserButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
