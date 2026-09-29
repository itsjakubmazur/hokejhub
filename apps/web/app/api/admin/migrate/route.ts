import { Client } from "pg";
import { MIGRATIONS } from "@/lib/server/migrations.generated";

/**
 * Applies SQL migrations from supabase/migrations (embedded at build time) that have not run yet.
 * Only repository SQL can run here — the endpoint takes no SQL input.
 *
 *   GET  /api/admin/migrate                 list applied / pending
 *   POST /api/admin/migrate                 apply pending
 *   POST /api/admin/migrate?baseline=NAME   mark NAME (and earlier) as applied without running
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
}

async function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  return client;
}

async function status(client: Client) {
  const { rows } = await client.query<{ name: string }>("select name from schema_migrations");
  const applied = new Set(rows.map((r) => r.name));
  return {
    applied: MIGRATIONS.filter((m) => applied.has(m.name)).map((m) => m.name),
    pending: MIGRATIONS.filter((m) => !applied.has(m.name)).map((m) => m.name),
  };
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const client = await connect();
  try {
    return Response.json(await status(client));
  } finally {
    await client.end();
  }
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const baseline = new URL(req.url).searchParams.get("baseline");
  const client = await connect();
  try {
    if (baseline) {
      for (const m of MIGRATIONS.filter((x) => x.name <= baseline)) {
        await client.query("insert into schema_migrations(name) values ($1) on conflict do nothing", [m.name]);
      }
      return Response.json(await status(client));
    }
    const { pending } = await status(client);
    const ran: string[] = [];
    for (const name of pending) {
      const m = MIGRATIONS.find((x) => x.name === name)!;
      await client.query("begin");
      try {
        await client.query(m.sql);
        await client.query("insert into schema_migrations(name) values ($1)", [name]);
        await client.query("commit");
        ran.push(name);
      } catch (e) {
        await client.query("rollback");
        return Response.json({ ran, failed: name, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
      }
    }
    // Make PostgREST pick up new tables / functions.
    await client.query("notify pgrst, 'reload schema'");
    return Response.json({ ran, ...(await status(client)) });
  } finally {
    await client.end();
  }
}
