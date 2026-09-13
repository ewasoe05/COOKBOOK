"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function hostedSnapshot() {
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

export function ApiKeyBanner() {
  const [missing, setMissing] = useState(false);
  const hosted = useSyncExternalStore(subscribe, hostedSnapshot, () => true);

  useEffect(() => {
    void fetch("/api/config")
      .then((res) => res.json())
      .then((body: { hasAiKey?: boolean; hasAnthropicKey?: boolean }) => {
        setMissing(!(body.hasAiKey ?? body.hasAnthropicKey));
      })
      .catch(() => setMissing(true));
  }, []);

  if (!missing) return null;

  return (
    <div className="border-b border-border bg-secondary px-4 py-3 text-secondary-foreground">
      <p className="mx-auto max-w-5xl text-sm">
        {hosted
          ? "Meal writing is not on this host yet. The rest of the cookbook still works."
          : "Set a server AI key to write weeks. In .env.local use AI_API_KEY plus optional AI_PROVIDER (anthropic, openai, openrouter, groq, or google), then restart. Visitors never paste a key."}
      </p>
    </div>
  );
}
