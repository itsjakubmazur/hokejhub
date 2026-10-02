import { attachDatabasePool } from "@vercel/functions";
import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export function dbAvailable() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * App queries go through Supavisor's transaction mode (port 6543): session mode (5432) caps the
 * project at 15 clients, and frozen serverless instances holding idle sockets exhausted it —
 * requests then queued for up to 30 s. Migrations keep using the session URL as configured.
 */
export function appDatabaseUrl(url: string): string {
  if (process.env.DATABASE_POOL_URL) return process.env.DATABASE_POOL_URL;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith(".pooler.supabase.com") && (u.port === "" || u.port === "5432")) u.port = "6543";
    return u.toString();
  } catch {
    return url;
  }
}

function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  if (!pool) {
    pool = new Pool({
      connectionString: appDatabaseUrl(url),
      ssl: url.includes("localhost") || url.includes("/var/") ? undefined : { rejectUnauthorized: false },
      max: 4,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 8_000,
    });
    // Close idle connections before Vercel suspends the instance instead of leaking them.
    attachDatabasePool(pool);
  }
  return pool;
}

/**
 * Connection-level failures worth another try: the pooler refusing or dropping a client under a
 * burst, a connect timeout. Query errors (syntax, constraint, a real timeout) are not retried.
 */
function transient(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  if (err?.code && /^(08\d{3}|53300|57P01|57P03|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE)$/.test(err.code)) return true;
  return /connection (terminated|timeout)|Connection terminated|timeout exceeded when trying to connect|max client connections|too many clients|ECONNRESET/i.test(err?.message ?? "");
}

const RETRY_MS = [250, 1000];

/**
 * Read-only query helper. Numeric/bigint columns come back as strings from pg — cast in SQL.
 * Transient connection failures are retried twice: one dropped connection used to fail a whole
 * build (prerendered pages query the database) or a page view.
 */
export async function sql<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      const { rows } = await getPool().query<T>(text, params);
      return rows;
    } catch (e) {
      if (attempt >= RETRY_MS.length || !transient(e)) throw e;
      console.warn(`[db] retry ${attempt + 1} after: ${(e as Error).message}`);
      await new Promise((r) => setTimeout(r, RETRY_MS[attempt]));
    }
  }
}
