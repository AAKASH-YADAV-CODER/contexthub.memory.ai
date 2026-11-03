"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardNavLink({
  active,
  variant = "pill",
}: {
  active: boolean;
  variant?: "pill" | "rail";
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/status");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setShow(Boolean(data.isAdmin));
      } catch {
        /* hide link */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  if (variant === "rail") {
    return (
      <Link
        href="/dashboard"
        title="Dashboard"
        className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition md:justify-start ${
          active
            ? "bg-teal-700 text-white shadow-sm"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs ${
            active ? "bg-white/15" : "bg-zinc-100 dark:bg-zinc-800"
          }`}
        >
          ◈
        </span>
        <span className="hidden md:inline">Dashboard</span>
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard"
      className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
        active
          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      }`}
    >
      Dashboard
    </Link>
  );
}
