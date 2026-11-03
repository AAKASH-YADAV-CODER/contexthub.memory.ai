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
      <aside className="flex w-16 shrink-0 flex-col items-center border-r border-zinc-200/80 bg-white py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <Link href="/" className="mb-4" title="ContextHub">
          <BrandLogo size={36} priority className="rounded-xl" />
        </Link>

        <nav className="flex flex-1 flex-col items-center gap-1">
          {navItems.map((item) => {
            const isActive = active === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                title={item.label}
                className={`flex h-11 w-11 flex-col items-center justify-center rounded-xl text-[10px] font-medium transition ${
                  isActive
                    ? "bg-teal-700 text-white shadow-sm"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
              >
                <span className="text-sm leading-none">{item.icon}</span>
                <span className="mt-0.5 leading-none">{item.label}</span>
              </Link>
            );
          })}
          <DashboardNavLink active={active === "dashboard"} variant="rail" />
        </nav>

        <div className="mt-auto flex justify-center pt-3">
          <UserButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
