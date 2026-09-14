import { describe, expect, it } from "vitest";
import { WeekSchema } from "@/lib/schemas";
import { DEMO_PROFILES, buildDemoSnapshot } from "@/lib/seed";
import { assembleWeek } from "@/lib/week";

describe("assembleWeek", () => {
  it("builds a valid week from seven day slices", () => {
    const demo = buildDemoSnapshot();
    const week = assembleWeek({
      weekId: "assembled-week",
      weekNumber: 2,
      createdAt: "2026-09-14T00:00:00.000Z",
      profile: DEMO_PROFILES.lifter,
      summary: "A surplus chapter built one day at a time.",
      days: demo.weeks[0].days,
      recipes: demo.recipes,
      pantry: [],
    });
    expect(WeekSchema.parse(week).number).toBe(2);
    expect(week.days).toHaveLength(7);
    expect(week.groceryList.length).toBeGreaterThan(0);
  });
});
