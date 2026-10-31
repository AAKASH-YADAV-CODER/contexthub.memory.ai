"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardNavLink({ active }: { active: boolean }) {
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
