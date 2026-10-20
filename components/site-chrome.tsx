"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import { isAuthPath, isCookModePath } from "@/lib/display";

function AuthHeaderLink() {
  const pathname = usePathname();
  const session = authClient.useSession();

  if (isAuthPath(pathname)) return null;
  if (session.isPending) {
    return <div className="h-11 w-16 animate-pulse bg-muted" aria-hidden />;
  }
  if (session.data) return null;

  return (
    <Link
      href="/sign-in"
      className="inline-flex h-11 items-center rounded-md px-3 text-base hover:bg-muted"
    >
      Sign in
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  if (isCookModePath(pathname)) return null;

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="font-wordmark text-xl tracking-display text-foreground sm:text-2xl"
        >
          Adaptive Cookbook
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <Link
            href="/cookbook"
            className="inline-flex h-11 items-center rounded-md px-3 text-base hover:bg-muted"
          >
            Cookbook
          </Link>
          <Link
            href="/grocery"
            className="inline-flex h-11 items-center rounded-md px-3 text-base hover:bg-muted"
          >
            Grocery
          </Link>
          <Link
            href="/profile"
            className="inline-flex h-11 items-center rounded-md px-3 text-base hover:bg-muted"
          >
            Profile
          </Link>
          <AuthHeaderLink />
          <ThemeToggle />
        </nav>
        <div className="flex items-center gap-1 md:hidden">
          <AuthHeaderLink />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
