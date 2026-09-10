import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
    hasUsdaKey: Boolean(process.env.USDA_API_KEY),
  });
}
