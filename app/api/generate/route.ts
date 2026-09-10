import { NextResponse } from "next/server";
import { ProfileSchema } from "@/lib/schemas";
import { generateWeekFromClaude } from "@/lib/generate";
import { UsdaCacheSchema } from "@/lib/usda";
import { hasAiKey } from "@/lib/ai";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  profile: ProfileSchema,
  liked: z.array(z.string()).default([]),
  disliked: z.array(z.string()).default([]),
  pantry: z.array(z.string()).default([]),
  weekNumber: z.number().int().positive(),
  usdaCache: UsdaCacheSchema.optional(),
});

export async function POST(request: Request) {
  if (!hasAiKey()) {
    return NextResponse.json(
      { error: "Meal writing is not configured yet.", code: "missing_key" },
      { status: 400 },
    );
  }
  try {
    const body = BodySchema.parse(await request.json());
    console.info("[generate] rating history", {
      liked: body.liked,
      disliked: body.disliked,
    });
    const result = await generateWeekFromClaude(body.profile, {
      liked: body.liked,
      disliked: body.disliked,
      pantry: body.pantry,
      weekNumber: body.weekNumber,
      usdaCache: body.usdaCache,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    console.error("[generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
