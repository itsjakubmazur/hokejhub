import { pragueDate } from "@hokejhub/core";
import { after } from "next/server";
import { ingestFinishedElh } from "@/lib/server/ingest";
import { tick, vapidConfigured } from "@/lib/server/push";
import { getScoreboard } from "@/lib/server/scoreboard";

/**
 * Rule-engine heartbeat, driven by the push-notify GitHub workflow (or any per-minute cron).
 * Runs two passes ~25 s apart while games are live so goal alerts arrive within ~30 s.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  // The heartbeat runs all through game windows, with or without visitors: store finished games.
  after(() =>
    getScoreboard(pragueDate())
      .then((b) => ingestFinishedElh(b.games))
      .catch((e) => console.error("[ingest] tick", e)),
  );
  if (!vapidConfigured()) return Response.json({ error: "VAPID not configured" }, { status: 503 });
  const first = await tick();
  if (first.games === 0 || first.nextActive === null || Date.parse(first.nextActive) > Date.now()) {
    return Response.json({ passes: [first], nextActive: first.nextActive });
  }
  await new Promise((r) => setTimeout(r, 25_000));
  const second = await tick();
  return Response.json({ passes: [first, second], nextActive: second.nextActive });
}
