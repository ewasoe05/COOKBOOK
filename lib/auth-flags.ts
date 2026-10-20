type Env = Record<string, string | undefined>;

function envOf(source?: Env): Env {
  return source ?? process.env;
}

export function isAuthEnabled(source?: Env): boolean {
  const env = envOf(source);
  return Boolean(env.DATABASE_URL && env.BETTER_AUTH_SECRET);
}

export function isGoogleEnabled(source?: Env): boolean {
  const env = envOf(source);
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function authBaseUrl(source?: Env): string {
  const env = envOf(source);
  return env.BETTER_AUTH_URL || env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
