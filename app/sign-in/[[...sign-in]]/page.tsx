import { SignIn } from "@clerk/nextjs";
import BrandLogo from "@/components/BrandLogo";

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-2">
        <BrandLogo size={56} className="rounded-2xl" priority />
        <p className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          ContextHub
        </p>
      </div>
      <SignIn />
    </div>
  );
}
