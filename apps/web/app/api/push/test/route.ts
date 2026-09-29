import { sql } from "@/lib/server/db";
import { send, vapidConfigured, type SubscriptionRow } from "@/lib/server/push";

/** Sends a test notification to the calling device (identified by its endpoint). */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!vapidConfigured()) return Response.json({ error: "VAPID není nastaveno" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  const [sub] = await sql<SubscriptionRow>("select id, endpoint, p256dh, auth, prefs from push_subscription where endpoint = $1", [body?.endpoint ?? ""]);
  if (!sub) return Response.json({ error: "neznámé zařízení" }, { status: 404 });
  const ok = await send(sub, { title: "🏒 HokejHub", body: "Upozornění fungují! Takhle ti přijde gól.", url: "/upozorneni", tag: "test" });
  return Response.json({ ok });
}
