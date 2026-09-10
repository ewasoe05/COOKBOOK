import { NextResponse } from "next/server";
import { MealTypeSchema, ProfileSchema } from "@/lib/schemas";
import { regenerateMealFromClaude } from "@/lib/generate";
import { UsdaCacheSchema } from "@/lib/usda";
import { hasAiKey } from "@/lib/ai";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  profile: ProfileSchema,
  oldTitle: z.string().min(1),
  mealType: MealTypeSchema,
  weekId: z.string().min(1),
  pantry: z.array(z.string()).default([]),
  liked: z.array(z.string()).default([]),
  disliked: z.array(z.string()).default([]),
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
    const result = await regenerateMealFromClaude(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Regenerate failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
