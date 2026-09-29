export type SourceState = "ok" | "stale" | "error" | "empty";

export interface Fetched<T> {
  data: T | null;
  state: SourceState;
  fetchedAt: string;
  error?: string;
}

const lastGood = new Map<string, { data: unknown; at: string }>();

const USER_AGENT = "HokejHub/0.1 (personal, non-commercial)";

/**
 * Fetches and parses JSON with Next's data cache. On failure it falls back to the last good
 * value seen by this server instance and reports the result as `stale`.
 */
export async function fetchJson<T>(
  url: string,
  parse: (json: unknown) => T,
  opts: { revalidate: number; notFoundIsEmpty?: boolean },
): Promise<Fetched<T>> {
  const now = new Date().toISOString();
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      next: { revalidate: opts.revalidate },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404 && opts.notFoundIsEmpty) return { data: null, state: "empty", fetchedAt: now };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
