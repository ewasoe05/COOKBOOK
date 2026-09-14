import { NextResponse } from "next/server";
import { ProfileSchema } from "@/lib/schemas";
import { generateDayFromClaude } from "@/lib/generate";
import { UsdaCacheSchema } from "@/lib/usda";
import { hasAiKey } from "@/lib/ai";
import { streamNdjson } from "@/lib/http";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const DaySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

const BodySchema = z.object({
  profile: ProfileSchema,
  liked: z.array(z.string()).default([]),
  disliked: z.array(z.string()).default([]),
  pantry: z.array(z.string()).default([]),
  weekNumber: z.number().int().positive(),
  weekId: z.string().min(1),
  day: DaySchema,
  previousTitles: z.array(z.string()).default([]),
  usdaCache: UsdaCacheSchema.optional(),
});

function publicError(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) {
    return "That week request was not valid. Check your profile and try again.";
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
    const message = publicError(error, "That week request was not valid.");
    console.error("[generate]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.info("[generate] day", {
    day: body.day,
    liked: body.liked,
    disliked: body.disliked,
    previous: body.previousTitles.length,
  });

  return streamNdjson(async (send) => {
    const result = await generateDayFromClaude(body.profile, {
      liked: body.liked,
      disliked: body.disliked,
      pantry: body.pantry,
      weekNumber: body.weekNumber,
      day: body.day,
      weekId: body.weekId,
      previousTitles: body.previousTitles,
      usdaCache: body.usdaCache,
    });
    send({
      type: "result",
      recipes: result.recipes,
      day: result.day,
      summary: result.summary,
      usdaCache: result.usdaCache,
    });
  }, "Generation failed");
}
