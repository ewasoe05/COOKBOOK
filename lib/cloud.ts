"use client";

import type { CloudRecord, CloudSnapshot } from "@/lib/sync";

export async function fetchCloudCookbook(): Promise<CloudRecord | null> {
  const res = await fetch("/api/cookbook");
  if (res.status === 401 || res.status === 503) return null;
  if (!res.ok) throw new Error("Could not load your saved cookbook.");
  const data = (await res.json()) as {
    snapshot: CloudSnapshot | null;
    updatedAt: string | null;
  };
  if (!data.snapshot || !data.updatedAt) return null;
  return { snapshot: data.snapshot, updatedAt: data.updatedAt };
}

export async function putCloudCookbook(snapshot: CloudSnapshot): Promise<CloudRecord> {
  const res = await fetch("/api/cookbook", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) throw new Error("Could not save your cookbook.");
  return (await res.json()) as CloudRecord;
}

export async function deleteCloudCookbook(): Promise<void> {
  const res = await fetch("/api/cookbook", { method: "DELETE" });
  if (res.status === 401 || res.status === 503) return;
  if (!res.ok) throw new Error("Could not reset the cloud cookbook.");
}
