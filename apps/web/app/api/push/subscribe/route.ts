import { sql } from "@/lib/server/db";

/**
 * Stores a browser push subscription with its notification preferences. The endpoint URL is a
 * capability issued by the push service, so it doubles as the device's identity (no accounts).
 */
export const dynamic = "force-dynamic";

interface Body {
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  prefs?: unknown;
}

const ALLOWED_HOSTS = /(^|\.)(googleapis\.com|mozilla\.com|mozaws\.net|windows\.com|notify\.windows\.com|push\.apple\.com)$/;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const s = body?.subscription;
  if (!s?.endpoint || !s.keys?.p256dh || !s.keys?.auth) return Response.json({ error: "bad subscription" }, { status: 400 });
  let host: string;
  try {
    host = new URL(s.endpoint).hostname;
  } catch {
    return Response.json({ error: "bad endpoint" }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.test(host)) return Response.json({ error: "unknown push service" }, { status: 400 });
  const prefs = JSON.stringify(body?.prefs ?? {}).slice(0, 8000);
  const [row] = await sql<{ id: string }>(
    `insert into push_subscription (user_id, endpoint, p256dh, auth, user_agent, prefs)
     values (gen_random_uuid(), $1, $2, $3, $4, $5::jsonb)
     on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, prefs = excluded.prefs, fail_count = 0
     returning id`,
    [s.endpoint, s.keys.p256dh, s.keys.auth, req.headers.get("user-agent")?.slice(0, 300) ?? null, prefs],
  );
  return Response.json({ ok: true, id: row!.id });
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (!body?.endpoint) return Response.json({ error: "missing endpoint" }, { status: 400 });
  await sql("delete from push_subscription where endpoint = $1", [body.endpoint]);
  return Response.json({ ok: true });
}
