export function isNetworkFailure(message: string): boolean {
  const lower = message.trim().toLowerCase();
  return (
    lower === "load failed" ||
    lower === "failed to fetch" ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("the internet connection appears to be offline") ||
    lower.includes("network connection was lost")
  );
}

export function friendlyGenerateError(error: unknown, fallback: string): string {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : fallback;
  if (isNetworkFailure(message)) {
    return "The connection dropped while writing this week. On a phone that often happens if the write takes a while or the screen locks. Stay on this page and try again.";
  }
  if (/unexpected token|not valid json|json.parse/i.test(message)) {
    return "The host sent an unreadable response. Try again in a moment.";
  }
  return message || fallback;
}

export type NdjsonEvent<T> = { type?: string; error?: string } & Partial<T>;

export function applyNdjsonLine<T>(
  line: string,
  state: { result: T | null; error: string | null },
): void {
  const trimmed = line.trim();
  if (!trimmed) return;
  const parsed = JSON.parse(trimmed) as NdjsonEvent<T>;
  if (parsed.type === "ping") return;
  if (parsed.type === "error") {
    state.error = parsed.error || "Could not write this week";
    return;
  }
  if (parsed.type === "result") {
    state.result = parsed as T;
  }
}

export async function readGenerateResponse<T extends Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("ndjson") && res.body) {
    return readNdjsonResult<T>(res);
  }

  const text = await res.text();
  if (!text.trim()) {
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    throw new Error("The host sent an empty response.");
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(
      res.ok
        ? "The host sent an unreadable response. Try again in a moment."
        : `Request failed (${res.status})`,
    );
  }

  if (!res.ok) {
    const err =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : null;
    throw new Error(err || `Request failed (${res.status})`);
  }

  return body as T;
}

async function readNdjsonResult<T extends Record<string, unknown>>(res: Response): Promise<T> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const state: { result: T | null; error: string | null } = { result: null, error: null };

  const consume = (line: string) => {
    applyNdjsonLine(line, state);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) consume(line);
    }
    if (buffer.trim()) consume(buffer);
  } catch (error) {
    if (state.result) return state.result;
    throw new Error(friendlyGenerateError(error, "The connection dropped while writing this week."));
  }

  if (state.error) throw new Error(state.error);
  if (state.result) return state.result;
  throw new Error("The host finished without a week. Try again.");
}

const PING_PAD = " ".repeat(1024);

export function streamNdjson(
  work: (send: (payload: unknown) => void) => Promise<void>,
  fallback = "Generation failed",
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };
      send({ type: "ping", pad: PING_PAD });
      const ping = setInterval(() => {
        try {
          send({ type: "ping" });
        } catch {
          /* stream already closed */
        }
      }, 8000);
      try {
        await work(send);
      } catch (error) {
        send({
          type: "error",
          error: error instanceof Error ? error.message : fallback,
        });
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

const CACHE_ENTRY_LIMIT = 400;

export function trimUsdaCache<T extends Record<string, unknown>>(cache: T | undefined): T | undefined {
  if (!cache) return undefined;
  const keys = Object.keys(cache);
  if (keys.length === 0) return undefined;
  if (keys.length <= CACHE_ENTRY_LIMIT) return cache;
  const trimmed = {} as T;
  for (const key of keys.slice(-CACHE_ENTRY_LIMIT)) {
    trimmed[key as keyof T] = cache[key as keyof T];
  }
  return trimmed;
}
