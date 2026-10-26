import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import BrandLogo from "@/components/BrandLogo";

type AppHeaderProps = {
  title: string;
  subtitle: string;
  active?: "chat" | "upload";
};

export default function AppHeader({
  title,
  subtitle,
  active = "chat",
}: AppHeaderProps) {
  return (
    <header className="shrink-0 border-b border-zinc-200/80 bg-white/80 px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 sm:px-6">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={32} priority />
            <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
              {title}
            </h1>
          </div>
          <p className="mt-0.5 pl-10 text-sm text-zinc-500">{subtitle}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <nav className="flex rounded-xl bg-zinc-100 p-1 text-sm dark:bg-zinc-900">
            <Link
              href="/"
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                active === "chat"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Chat
            </Link>
            <Link
              href="/upload"
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                active === "upload"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Upload
            </Link>
          </nav>
          <UserButton />
        </div>
      </div>
    </header>
  );
}
