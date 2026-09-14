"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ShoppingBasket, User } from "lucide-react";
import { isAuthPath, isCookModePath } from "@/lib/display";

const ITEMS = [
  { href: "/cookbook", label: "Cookbook", icon: BookOpen },
  { href: "/grocery", label: "Grocery", icon: ShoppingBasket },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/" || isAuthPath(pathname) || isCookModePath(pathname)) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-3 pt-1 md:hidden"
      aria-label="App"
    >
      <ul className="mx-auto flex max-w-lg">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex h-14 flex-col items-center justify-center gap-1 text-xs ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" strokeWidth={1.5} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
