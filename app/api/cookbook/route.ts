import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cookbookSnapshots } from "@/lib/db-schema";
import { getDb } from "@/lib/db";
import { CloudSnapshotSchema } from "@/lib/sync";

export const runtime = "nodejs";

async function requireUser() {
  const db = getDb();
  const session = await getSession();
  if (!db || !session?.user) {
    return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  return { db, userId: session.user.id };
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const [row] = await auth.db
    .select()
    .from(cookbookSnapshots)
    .where(eq(cookbookSnapshots.userId, auth.userId))
    .limit(1);

  if (!row) {
    return NextResponse.json({ snapshot: null, updatedAt: null });
  }

  const parsed = CloudSnapshotSchema.safeParse(row.payload);
  if (!parsed.success) {
    return NextResponse.json({ snapshot: null, updatedAt: null });
  }

  return NextResponse.json({
    snapshot: parsed.data,
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function PUT(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = CloudSnapshotSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Cookbook data was not valid." }, { status: 400 });
  }

  const updatedAt = new Date();
  await auth.db
    .insert(cookbookSnapshots)
    .values({
      userId: auth.userId,
      payload: parsed.data,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: cookbookSnapshots.userId,
      set: { payload: parsed.data, updatedAt },
    });

  return NextResponse.json({
    snapshot: parsed.data,
    updatedAt: updatedAt.toISOString(),
  });
}

export async function DELETE() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  await auth.db.delete(cookbookSnapshots).where(eq(cookbookSnapshots.userId, auth.userId));
  return new NextResponse(null, { status: 204 });
}
