import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { authBaseUrl, isAuthEnabled, isGoogleEnabled } from "@/lib/auth-flags";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db-schema";

function createAuth() {
  const db = getDb();
  if (!db) return null;
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: authBaseUrl(),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: isGoogleEnabled()
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          },
        }
      : undefined,
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
      },
    },
    plugins: [nextCookies()],
  });
}

let cached: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (cached !== undefined) return cached;
  if (!isAuthEnabled()) {
    cached = null;
    return cached;
  }
  cached = createAuth();
  return cached;
}

export async function getSession() {
  const auth = getAuth();
  if (!auth) return null;
  return auth.api.getSession({ headers: await headers() });
}
