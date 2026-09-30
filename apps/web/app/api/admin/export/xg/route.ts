import { sql } from "@/lib/server/db";

/**
 * Read-only training export for the xG model (requires CRON_SECRET): every finished extraliga
 * game of a season with its penalties and goals, so shot strength can be reconstructed.
 *
 *   GET /api/admin/export/xg?season=2023
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const season = Number(new URL(req.url).searchParams.get("season"));
  if (!Number.isInteger(season)) return Response.json({ error: "season required" }, { status: 400 });
  const rows = await sql<{ id: string; phase: string; home: string; events: { t: string; p: number; s: number; team: string; sit: string | null; min: number | null }[] | null }>(
    `select g.id, g.phase, g.home_team_id as home,
            (select json_agg(json_build_object('t', e.type, 'p', e.period, 's', e.period_seconds, 'team', e.team_id,
                                               'sit', e.situation, 'min', (e.payload->>'minutes')::int) order by e.period, e.period_seconds)
             from game_event e where e.game_id = g.id and e.type in ('goal', 'penalty')) as events
     from game g
     where g.league_id = 'cz-elh' and g.season = $1 and g.status = 'final' and g.id like 'hcz-%'
     order by g.start_at`,
    [season],
  );
  return Response.json({
    season,
    games: rows.map((r) => ({
      id: Number(r.id.slice(4)),
      phase: r.phase,
      penalties: (r.events ?? []).filter((e) => e.t === "penalty").map((e) => ({ e: (e.p - 1) * 1200 + e.s, home: e.team === r.home, min: e.min })),
      goals: (r.events ?? []).filter((e) => e.t === "goal").map((e) => ({ e: (e.p - 1) * 1200 + e.s, home: e.team === r.home, sit: e.sit })),
    })),
  });
}
