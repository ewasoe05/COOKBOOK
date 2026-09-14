import { NextResponse } from "next/server";
import { MealTypeSchema, ProfileSchema } from "@/lib/schemas";
import { regenerateMealFromClaude } from "@/lib/generate";
import { UsdaCacheSchema } from "@/lib/usda";
import { hasAiKey } from "@/lib/ai";
import { streamNdjson } from "@/lib/http";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

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

function publicError(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) {
    return "That swap request was not valid. Try again.";
  }
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request: Request) {
  if (!hasAiKey()) {
    return NextResponse.json(
      { error: "Meal writing is not configured yet.", code: "missing_key" },
      { status: 400 },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: publicError(error, "That swap request was not valid.") },
      { status: 400 },
    );
  }

  return streamNdjson(async (send) => {
    const result = await regenerateMealFromClaude(body);
    send({
      type: "result",
      recipe: result.recipe,
      usdaCache: result.usdaCache,
    });
  }, "Regenerate failed");
}
