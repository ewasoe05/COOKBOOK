"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { useCookbookStore } from "@/lib/store";
import { DEMO_PROFILES } from "@/lib/seed";

export function HomeGate() {
  const profile = useCookbookStore((s) => s.profile);
  const search = useSearchParams();
  const router = useRouter();
  const demoKey = search.get("demo");
  const demo =
    demoKey === "lifter" || demoKey === "parent" || demoKey === "managed"
      ? DEMO_PROFILES[demoKey]
      : undefined;

  useEffect(() => {
    if (profile && !demo) router.replace("/cookbook");
  }, [profile, demo, router]);

  if (profile && !demo) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  }

  return <OnboardingWizard initial={demo ?? undefined} />;
}
