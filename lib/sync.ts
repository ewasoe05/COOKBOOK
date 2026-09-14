import { z } from "zod";
import {
  CheckInSchema,
  ProfileSchema,
  RecipeSchema,
  WeekSchema,
} from "@/lib/schemas";
import type { CookbookSnapshot } from "@/lib/storage";

export const CloudSnapshotSchema = z.object({
  profile: ProfileSchema.nullable(),
  weeks: z.array(WeekSchema),
  recipes: z.array(RecipeSchema),
  checkIns: z.array(CheckInSchema),
  pantry: z.array(z.string()),
});

export type CloudSnapshot = z.infer<typeof CloudSnapshotSchema>;

export type CloudRecord = {
  updatedAt: string;
  snapshot: CloudSnapshot;
};

export type SyncDecision =
  | { action: "keep-local"; reason: "both-empty" | "same-time" }
  | { action: "upload"; snapshot: CloudSnapshot }
  | { action: "download"; snapshot: CloudSnapshot; updatedAt: string };

export function toCloudSnapshot(snapshot: CookbookSnapshot): CloudSnapshot {
  return {
    profile: snapshot.profile,
    weeks: snapshot.weeks,
    recipes: snapshot.recipes,
    checkIns: snapshot.checkIns,
    pantry: snapshot.pantry,
  };
}

export function applyCloudSnapshot(
  cloud: CloudSnapshot,
  usdaCache: CookbookSnapshot["usdaCache"],
): CookbookSnapshot {
  return {
    ...cloud,
    usdaCache,
  };
}

export function isCloudEmpty(snapshot: CloudSnapshot | null | undefined): boolean {
  if (!snapshot) return true;
  return (
    !snapshot.profile &&
    snapshot.weeks.length === 0 &&
    snapshot.recipes.length === 0 &&
    snapshot.checkIns.length === 0 &&
    snapshot.pantry.length === 0
  );
}

export function decideSync(
  local: { snapshot: CloudSnapshot; updatedAt: string | null },
  remote: CloudRecord | null,
): SyncDecision {
  const localEmpty = isCloudEmpty(local.snapshot);
  const remoteEmpty = isCloudEmpty(remote?.snapshot);

  if (remoteEmpty && !localEmpty) {
    return { action: "upload", snapshot: local.snapshot };
  }
  if (!remoteEmpty && localEmpty && remote) {
    return { action: "download", snapshot: remote.snapshot, updatedAt: remote.updatedAt };
  }
  if (localEmpty && remoteEmpty) {
    return { action: "keep-local", reason: "both-empty" };
  }

  const localTs = local.updatedAt ? Date.parse(local.updatedAt) : 0;
  const remoteTs = remote?.updatedAt ? Date.parse(remote.updatedAt) : 0;
  if (remote && remoteTs > localTs) {
    return { action: "download", snapshot: remote.snapshot, updatedAt: remote.updatedAt };
  }
  if (!localEmpty && localTs > remoteTs) {
    return { action: "upload", snapshot: local.snapshot };
  }
  return { action: "keep-local", reason: "same-time" };
}
