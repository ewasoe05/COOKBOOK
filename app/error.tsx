"use client";

import { Button } from "@/components/ui/button";
import { isNetworkFailure } from "@/lib/http";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const network = isNetworkFailure(error.message);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl tracking-display">This page didn&apos;t load.</h1>
      <p className="measure text-lg leading-body text-muted-foreground">
        {network
          ? "The connection dropped before this screen arrived. That is common on phones. Stay here and try again."
          : error.message || "Something in the kitchen hiccuped."}
      </p>
      <Button type="button" size="touch" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
