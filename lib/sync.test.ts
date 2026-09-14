import { describe, expect, it } from "vitest";
import { DEMO_PROFILES } from "@/lib/seed";
import {
  applyCloudSnapshot,
  decideSync,
  isCloudEmpty,
  toCloudSnapshot,
  type CloudSnapshot,
} from "@/lib/sync";
import type { CookbookSnapshot } from "@/lib/storage";

const emptyCloud = (): CloudSnapshot => ({
  profile: null,
  weeks: [],
  recipes: [],
  checkIns: [],
  pantry: [],
});

const localCloud = (): CloudSnapshot => ({
  ...emptyCloud(),
  profile: DEMO_PROFILES.parent,
  pantry: ["oats"],
});

describe("cloud snapshot helpers", () => {
  it("treats a missing profile and empty lists as empty", () => {
    expect(isCloudEmpty(null)).toBe(true);
    expect(isCloudEmpty(emptyCloud())).toBe(true);
    expect(isCloudEmpty(localCloud())).toBe(false);
  });

  it("drops the USDA cache when preparing a cloud payload", () => {
    const snapshot: CookbookSnapshot = {
      ...localCloud(),
      usdaCache: {
        oats: {
          query: "oats",
          fdcId: 1,
          description: "Oats",
          per100g: {
            calories: 380,
            proteinG: 13,
            carbsG: 67,
            fatG: 6,
            fiberG: 10,
            sodiumMg: 2,
            addedSugarG: 0,
          },
        },
      },
    };
    expect(toCloudSnapshot(snapshot)).toEqual(localCloud());
    expect(applyCloudSnapshot(localCloud(), snapshot.usdaCache).usdaCache).toEqual(
      snapshot.usdaCache,
    );
  });
});

describe("decideSync", () => {
  it("uploads a local cookbook when the cloud is empty", () => {
    const local = localCloud();
    expect(
      decideSync({ snapshot: local, updatedAt: "2026-01-02T00:00:00.000Z" }, null),
    ).toEqual({ action: "upload", snapshot: local });
  });

  it("downloads when this device is empty and the cloud has a cookbook", () => {
    const remote = {
      snapshot: localCloud(),
      updatedAt: "2026-01-03T00:00:00.000Z",
    };
    expect(decideSync({ snapshot: emptyCloud(), updatedAt: null }, remote)).toEqual({
      action: "download",
      snapshot: remote.snapshot,
      updatedAt: remote.updatedAt,
    });
  });

  it("keeps an empty device when the cloud is also empty", () => {
    expect(decideSync({ snapshot: emptyCloud(), updatedAt: null }, null)).toEqual({
      action: "keep-local",
      reason: "both-empty",
    });
  });

  it("uses last write when both sides have data", () => {
    const older = localCloud();
    const newer: CloudSnapshot = { ...emptyCloud(), profile: DEMO_PROFILES.lifter };
    expect(
      decideSync(
        { snapshot: older, updatedAt: "2026-01-01T00:00:00.000Z" },
        { snapshot: newer, updatedAt: "2026-01-04T00:00:00.000Z" },
      ),
    ).toEqual({
      action: "download",
      snapshot: newer,
      updatedAt: "2026-01-04T00:00:00.000Z",
    });
    expect(
      decideSync(
        { snapshot: older, updatedAt: "2026-01-05T00:00:00.000Z" },
        { snapshot: newer, updatedAt: "2026-01-04T00:00:00.000Z" },
      ),
    ).toEqual({ action: "upload", snapshot: older });
  });

  it("keeps local when timestamps match", () => {
    const local = localCloud();
    expect(
      decideSync(
        { snapshot: local, updatedAt: "2026-01-04T00:00:00.000Z" },
        { snapshot: local, updatedAt: "2026-01-04T00:00:00.000Z" },
      ),
    ).toEqual({ action: "keep-local", reason: "same-time" });
  });
});
