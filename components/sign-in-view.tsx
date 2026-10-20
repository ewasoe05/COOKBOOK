"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useCookbookStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthConfig = {
  authEnabled: boolean;
  googleEnabled: boolean;
};

export function SignInView() {
  const router = useRouter();
  const hydrate = useCookbookStore((s) => s.hydrate);
  const session = authClient.useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [config, setConfig] = useState<AuthConfig | null>(null);

  useEffect(() => {
    void fetch("/api/config")
      .then((res) => res.json())
      .then((body: AuthConfig) => {
        setConfig({
          authEnabled: Boolean(body.authEnabled),
          googleEnabled: Boolean(body.googleEnabled),
        });
      })
      .catch(() => setConfig({ authEnabled: false, googleEnabled: false }));
  }, []);

  useEffect(() => {
    if (!session.data) return;
    let cancelled = false;
    void (async () => {
      await hydrate();
      if (cancelled) return;
      const profile = useCookbookStore.getState().profile;
      router.replace(profile ? "/cookbook" : "/");
    })();
    return () => {
      cancelled = true;
    };
  }, [session.data, hydrate, router]);

  async function finishAuth() {
    await hydrate();
    const profile = useCookbookStore.getState().profile;
    router.replace(profile ? "/cookbook" : "/");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (mode === "signup" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    const name = email.split("@")[0] || "Cook";
    const result =
      mode === "signup"
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError(result.error.message || "Could not sign in.");
      return;
    }
    await finishAuth();
  }

  async function onGoogle() {
    setError(null);
    setPending(true);
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
    if (result.error) {
      setPending(false);
      setError(result.error.message || "Google sign-in failed.");
    }
  }

  if (config === null || session.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-hidden>
        <div className="h-10 w-64 animate-pulse bg-muted" />
        <div className="h-4 w-full max-w-xl animate-pulse bg-muted" />
        <div className="h-11 w-full max-w-md animate-pulse bg-muted" />
        <div className="h-11 w-full max-w-md animate-pulse bg-muted" />
      </div>
    );
  }

  if (!config.authEnabled) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-4xl tracking-display">Save this cookbook</h1>
        <p className="measure text-lg leading-body text-muted-foreground">
          Sign-in needs a database on the host. Until that is set, your cookbook stays on this
          device.
        </p>
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          Back to the kitchen
        </Link>
      </div>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <header>
        <h1 className="font-display text-4xl tracking-display">
          {mode === "signin" ? "Welcome back" : "Keep your cookbook"}
        </h1>
        <p className="measure mt-3 text-lg leading-body text-muted-foreground">
          {mode === "signin"
            ? "Sign in on this phone or computer to pick up the same weeks, grocery list, and profile."
            : "Create an account so a new phone or computer can restore this cookbook."}
        </p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
        <label className="flex flex-col gap-2 text-sm">
          Email
          <Input
            className="h-11"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Password
          <Input
            className="h-11"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {mode === "signup" ? (
          <label className="flex flex-col gap-2 text-sm">
            Confirm password
            <Input
              className="h-11"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </label>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" size="touch" disabled={pending}>
          {pending
            ? mode === "signup"
              ? "Creating account…"
              : "Signing in…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      {config.googleEnabled ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Or</p>
          <Button
            type="button"
            variant="outline"
            size="touch"
            disabled={pending}
            onClick={() => void onGoogle()}
          >
            <LogIn strokeWidth={1.5} />
            Continue with Google
          </Button>
        </div>
      ) : null}

      <p className="text-sm">
        {mode === "signin" ? "New here? " : "Already have an account? "}
        <button
          type="button"
          className="text-primary underline-offset-4 hover:underline"
          onClick={() => {
            setError(null);
            setMode(mode === "signin" ? "signup" : "signin");
          }}
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>

      <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
        Continue without an account
      </Link>
    </div>
  );
}
