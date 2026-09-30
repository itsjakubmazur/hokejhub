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

/** Read-only query helper. Numeric/bigint columns come back as strings from pg — cast in SQL. */
export async function sql<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await getPool().query<T>(text, params);
  return rows;
}
