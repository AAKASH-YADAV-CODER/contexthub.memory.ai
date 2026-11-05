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
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
          active
            ? "bg-white font-medium text-teal-800 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-teal-200 dark:ring-zinc-700"
            : "text-zinc-600 hover:bg-white/70 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" strokeLinejoin="round" />
        </svg>
        Dashboard
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
