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
  { href: "/", id: "chat" as const, label: "Chat", icon: "◎" },
  { href: "/upload", id: "upload" as const, label: "Upload", icon: "↑" },
];

export default function AppShell({ active, children }: AppShellProps) {
  return (
    <div className="flex h-dvh overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      {/* Left app rail */}
      <aside className="flex w-[72px] shrink-0 flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:w-56">
        <div className="flex items-center gap-2.5 border-b border-zinc-100 px-3 py-4 dark:border-zinc-800 md:px-4">
          <BrandLogo size={36} priority className="rounded-xl" />
          <div className="hidden min-w-0 md:block">
            <p className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              ContextHub
            </p>
            <p className="truncate text-[11px] text-zinc-500">Knowledge agent</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-2 md:p-3">
          {navItems.map((item) => {
            const isActive = active === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition md:justify-start ${
                  isActive
                    ? "bg-teal-700 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
                title={item.label}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs ${
                    isActive ? "bg-white/15" : "bg-zinc-100 dark:bg-zinc-800"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
          <DashboardNavLink active={active === "dashboard"} variant="rail" />
        </nav>

        <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
          <div className="flex items-center justify-center gap-3 md:justify-start md:px-1">
            <UserButton />
            <div className="hidden min-w-0 md:block">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                Account
              </p>
              <p className="text-[11px] text-zinc-500">Signed in</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Page content */}
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
