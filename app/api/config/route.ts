import { NextResponse } from "next/server";
import { hasAiKey, resolveAiConfig } from "@/lib/ai";
import { isAuthEnabled, isGoogleEnabled } from "@/lib/auth-flags";

export const runtime = "nodejs";

export async function GET() {
  const config = resolveAiConfig();
  const authEnabled = isAuthEnabled();
  return NextResponse.json({
    hasAiKey: hasAiKey(),
    hasAnthropicKey: hasAiKey(),
    provider: config?.provider ?? null,
    hasUsdaKey: Boolean(process.env.USDA_API_KEY),
    authEnabled,
    googleEnabled: authEnabled && isGoogleEnabled(),
  });
}
