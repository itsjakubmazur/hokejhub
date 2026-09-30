import { setBonusAnswer } from "@/lib/server/tipping";

/** POST /api/admin/tip-bonus?id=nhl-2026-cup&answer=nhl-FLA — settle a season question by hand. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const id = sp.get("id");
  const answer = sp.get("answer");
  if (!id || !answer) return Response.json({ error: "id and answer required" }, { status: 400 });
  await setBonusAnswer(id, answer);
  return Response.json({ ok: true });
}
