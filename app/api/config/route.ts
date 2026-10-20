import { NextResponse } from "next/server";
import { hasAiKey, resolveAiConfig } from "@/lib/ai";
import { isAuthEnabled, isGoogleEnabled } from "@/lib/auth-flags";
import { hasUsdaKey } from "@/lib/usda";

export const runtime = "nodejs";

export async function GET() {
  const config = resolveAiConfig();
  const authEnabled = isAuthEnabled();
  return NextResponse.json({
    hasAiKey: hasAiKey(),
    hasAnthropicKey: hasAiKey(),
    provider: config?.provider ?? null,
    hasUsdaKey: hasUsdaKey(),
    authEnabled,
    googleEnabled: authEnabled && isGoogleEnabled(),
  });
}
