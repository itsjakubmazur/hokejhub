export type SourceState = "ok" | "stale" | "error" | "empty";

export interface Fetched<T> {
  data: T | null;
  state: SourceState;
  fetchedAt: string;
  error?: string;
}

const lastGood = new Map<string, { data: unknown; at: string }>();

const USER_AGENT = "HokejHub/0.1 (personal, non-commercial)";

const RETRY_DELAYS_MS = [400, 1200];

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET with retries (exponential backoff) on network errors, timeouts and 5xx/429. */
async function fetchWithRetry(url: string, revalidate: number): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": USER_AGENT, accept: "application/json" },
        next: { revalidate },
        signal: AbortSignal.timeout(8000),
      });
      const retryable = res.status >= 500 || res.status === 429;
      if (!retryable || attempt >= RETRY_DELAYS_MS.length) return res;
    } catch (e) {
      if (attempt >= RETRY_DELAYS_MS.length) throw e;
    }
    await sleep(RETRY_DELAYS_MS[attempt]!);
  }
}

/**
 * Fetches and parses JSON with Next's data cache. With `notFoundIsEmpty`, a 404 means "no data
 * for this key" (e.g. a day without games), not a failure. On failure it falls back to the last
 * good value seen by this server instance and reports the result as `stale`.
 */
export async function fetchJson<T>(
  url: string,
  parse: (json: unknown) => T,
  opts: { revalidate: number; notFoundIsEmpty?: boolean },
): Promise<Fetched<T>> {
  const now = new Date().toISOString();
  try {
    const res = await fetchWithRetry(url, opts.revalidate);
    if (res.status === 404 && opts.notFoundIsEmpty) return { data: null, state: "empty", fetchedAt: now };
    if (!res.ok) throw new HttpError(res.status);
    const data = parse(await res.json());
    lastGood.set(url, { data, at: now });
    return { data, state: "ok", fetchedAt: now };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[fetch] ${url}: ${error}`);
    const prev = lastGood.get(url);
    if (prev) return { data: prev.data as T, state: "stale", fetchedAt: prev.at, error };
    return { data: null, state: "error", fetchedAt: now, error };
  }
}
