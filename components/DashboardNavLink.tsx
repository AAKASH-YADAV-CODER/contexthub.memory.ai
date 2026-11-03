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
        className={`flex h-11 w-11 flex-col items-center justify-center rounded-xl text-[10px] font-medium transition ${
          active
            ? "bg-teal-700 text-white shadow-sm"
            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        }`}
      >
        <span className="text-sm leading-none">◈</span>
        <span className="mt-0.5 leading-none">Dash</span>
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
