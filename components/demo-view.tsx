"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEMO_PROFILES, buildDemoSnapshot } from "@/lib/seed";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { useCookbookStore } from "@/lib/store";

const LABELS = {
  lifter: "20-year-old lifter, bulking",
  parent: "Parent of four, simpler dinners",
  managed: "55, low sodium",
} as const;

export function DemoView() {
  const importAll = useCookbookStore((s) => s.importAll);
  const router = useRouter();

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="font-display text-4xl tracking-display">Try a kitchen</h1>
      <p className="text-muted-foreground">
        Pre-fills onboarding so you can walk the app without typing. If this host has an AI key,
        writing a week just works. The sample chapter below is labeled demo data.
      </p>
      {(Object.keys(DEMO_PROFILES) as Array<keyof typeof DEMO_PROFILES>).map((key) => (
        <Link key={key} href={`/?demo=${key}`} className={cn(buttonVariants({ size: "touch" }), "w-full")}>
          {LABELS[key]}
        </Link>
      ))}
      <Button
        size="touch"
        variant="outline"
        onClick={async () => {
          await importAll(buildDemoSnapshot());
          router.push("/cookbook");
        }}
      >
        Load sample chapter
      </Button>
    </div>
  );
}
