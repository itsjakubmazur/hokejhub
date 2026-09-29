import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export function dbAvailable() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not configured");
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("/var/") ? undefined : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
  });
  return pool;
}

/** Read-only query helper. Numeric/bigint columns come back as strings from pg — cast in SQL. */
export async function sql<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await getPool().query<T>(text, params);
  return rows;
}
