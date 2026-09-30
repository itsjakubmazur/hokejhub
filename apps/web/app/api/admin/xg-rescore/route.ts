import { sql } from "@/lib/server/db";

/** Re-score one season of stored extraliga shots with the current xG model (requires CRON_SECRET). */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const season = Number(new URL(req.url).searchParams.get("season"));
  if (!Number.isInteger(season)) return Response.json({ error: "season required" }, { status: 400 });
  const t = Date.now();
  const [r] = await sql<{ n: number }>("select rescore_elh_xg($1) as n", [season]);
  return Response.json({ season, shots: r?.n ?? 0, ms: Date.now() - t });
}
