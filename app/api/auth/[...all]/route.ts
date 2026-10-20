import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";

function handler() {
  const auth = getAuth();
  if (!auth) {
    return {
      GET: () => NextResponse.json({ error: "Auth is not configured." }, { status: 503 }),
      POST: () => NextResponse.json({ error: "Auth is not configured." }, { status: 503 }),
      PUT: () => NextResponse.json({ error: "Auth is not configured." }, { status: 503 }),
      PATCH: () => NextResponse.json({ error: "Auth is not configured." }, { status: 503 }),
      DELETE: () => NextResponse.json({ error: "Auth is not configured." }, { status: 503 }),
    };
  }
  return toNextJsHandler(auth);
}

const authHandler = handler();

export const GET = authHandler.GET;
export const POST = authHandler.POST;
export const PUT = authHandler.PUT;
export const PATCH = authHandler.PATCH;
export const DELETE = authHandler.DELETE;
