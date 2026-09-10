"use client";

import { useEffect, useState } from "react";

export function ApiKeyBanner() {
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    void fetch("/api/config")
      .then((res) => res.json())
      .then((body: { hasAnthropicKey?: boolean }) => {
        setMissing(!body.hasAnthropicKey);
      })
      .catch(() => setMissing(true));
  }, []);

  if (!missing) return null;

  return (
    <div className="border-b border-border bg-secondary px-4 py-3 text-secondary-foreground">
      <p className="mx-auto max-w-5xl text-sm">
        Add your API key to generate weeks. Create <span className="font-medium">.env.local</span> with{" "}
        <span className="font-medium">ANTHROPIC_API_KEY</span> and restart the dev server. The rest of
        the cookbook still works.
      </p>
    </div>
  );
}
