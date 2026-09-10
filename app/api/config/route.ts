import { NextResponse } from "next/server";
import { hasAiKey, resolveAiConfig } from "@/lib/ai";

export const runtime = "nodejs";

export async function GET() {
  const config = resolveAiConfig();
  return NextResponse.json({
    hasAiKey: hasAiKey(),
    hasAnthropicKey: hasAiKey(),
    provider: config?.provider ?? null,
    hasUsdaKey: Boolean(process.env.USDA_API_KEY),
  });
}
