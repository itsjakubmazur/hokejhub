import type { Game, HokejczMatch, HokejczPlayerRef, HokejczTeam } from "@hokejhub/core";
import { dbAvailable, sql } from "./db";

/**
 * A stored extraliga game in the shape of a parsed hokej.cz match page, for when the page itself
 * cannot be read (hokej.cz's Cloudflare refuses Vercel's addresses): the crawler keeps goals,
 * penalties and the box score in the database, from the match page or from the S3 files.
 */

interface GameRow {
  id: string;
  start_at: Date;
  status: string;
  status_label: string | null;
  home_team_id: string;
  away_team_id: string;
  home_name: string;
  away_name: string;
  home_score: number | null;
  away_score: number | null;
  periods: [number, number][] | null;
  decided_in: "REG" | "OT" | "SO" | null;
  series: string | null;
  round: string | null;
  attendance: number | null;
  capacity: number | null;
  venue: string | null;
  referees: string[] | null;
  team_stats: Record<string, [number, number]> | null;
  league_name: string | null;
}

interface TeamRow {
  id: string;
  name: string;
  short_name: string | null;
  abbrev: string | null;
  logo_url: string | null;
}

const PRAGUE = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "30.10.2026 17:30", as the match page heading shows it. */
function startLocal(d: Date): string {
  const p = Object.fromEntries(PRAGUE.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`;
}

const numericId = (id: string) => (/^hcz-(\d+)$/.test(id) ? Number(id.slice(4)) : null);
const clubId = (teamId: string) => numericId(teamId);

export async function matchFromDb(hczId: number): Promise<{ game: Game; box: HokejczMatch | null } | null> {
  if (!dbAvailable()) return null;
  const gameId = `hcz-${hczId}`;
  const [g] = await sql<GameRow>(
    `select g.id, g.start_at, g.status, g.status_label, g.home_team_id, g.away_team_id, g.home_name, g.away_name,
            g.home_score, g.away_score, g.periods, g.decided_in, g.series, g.round, g.attendance, g.capacity, g.venue,
            g.referees, g.team_stats, l.name as league_name
     from game g left join league l on l.id = g.league_id where g.id = $1`,
    [gameId],
  );
  if (!g) return null;
  const teams = await sql<TeamRow>("select id, name, short_name, abbrev, logo_url from team where id in ($1, $2)", [g.home_team_id, g.away_team_id]);
  const teamOf = (id: string, fallback: string): HokejczTeam => {
    const t = teams.find((x) => x.id === id);
    return {
      name: t?.name ?? fallback,
      shortName: t?.short_name ?? t?.name ?? fallback,
      abbrev: t?.abbrev ?? "",
      clubId: clubId(id),
      logoUrl: t?.logo_url ?? null,
    };
  };
  const home = teamOf(g.home_team_id, g.home_name);
  const away = teamOf(g.away_team_id, g.away_name);
  const final = g.status === "final";
  const game: Game = {
    id: gameId,
    source: "esports",
    leagueKey: "cz-elh",
    leagueName: g.league_name ?? "Tipsport extraliga",
    startAt: new Date(g.start_at).toISOString(),
    status: final ? "final" : g.status === "cancelled" ? "cancelled" : g.home_score !== null ? "live" : "scheduled",
    statusLabel: g.status_label ?? "",
    period: null,
    clock: null,
    home: { id: g.home_team_id, name: home.name, shortName: home.shortName, abbrev: home.abbrev, logoUrl: home.logoUrl },
    away: { id: g.away_team_id, name: away.name, shortName: away.shortName, abbrev: away.abbrev, logoUrl: away.logoUrl },
    homeScore: g.home_score,
    awayScore: g.away_score,
    periods: g.periods ?? [],
    decidedIn: g.decided_in,
    series: g.series,
    preOdds: null,
    external: { hokejczId: hczId },
  };

  const [skaters, goalies, events] = await Promise.all([
    sql<{
      player_id: string; team_id: string; number: number | null; position: string | null; toi_s: number | null; pp_toi_s: number | null;
      sh_toi_s: number | null; g: number | null; a: number | null; pts: number | null; pim: number | null; pm: number | null; hits: number | null;
      sog: number | null; blk: number | null; fo_w: number | null; fo_taken: number | null; ri: number | null; name: string | null;
    }>(
      `select b.player_id, b.team_id, b.number, b.position, b.toi_s, b.pp_toi_s, b.sh_toi_s, b.g, b.a, b.pts, b.pim, b.pm, b.hits,
              b.sog, b.blk, b.fo_w, b.fo_taken, b.ri, p.name
       from box_skater b left join player p on p.id = b.player_id where b.game_id = $1 order by b.number nulls last`,
      [gameId],
    ),
    sql<{
      player_id: string; team_id: string; number: number | null; toi_s: number | null; saves: number | null; ga: number | null;
      sv_pct: number | null; extra: { assists?: number; pim?: number } | null; name: string | null;
    }>(
      `select b.player_id, b.team_id, b.number, b.toi_s, b.saves, b.ga, b.sv_pct, b.extra, p.name
       from box_goalie b left join player p on p.id = b.player_id where b.game_id = $1 order by b.number nulls last`,
      [gameId],
    ),
    sql<{ seq: number; type: string; team_id: string | null; player_ids: string[] | null; situation: string | null; payload: Record<string, unknown> | null }>(
      "select seq, type, team_id, player_ids, situation, payload from game_event where game_id = $1 and type in ('goal', 'penalty') order by seq",
      [gameId],
    ),
  ]);
  if (!skaters.length && !goalies.length) return { game, box: null };

  // Names of everyone the events mention.
  const ids = new Set<string>();
  for (const e of events) {
    for (const id of e.player_ids ?? []) ids.add(id);
    for (const k of ["onIcePlus", "onIceMinus"]) for (const id of (e.payload?.[k] as string[] | undefined) ?? []) ids.add(id);
  }
  const names = new Map(
    (ids.size ? await sql<{ id: string; name: string }>("select id, name from player where id = any($1)", [[...ids]]) : []).map((p) => [p.id, p.name]),
  );
  const ref = (id: string | null | undefined): HokejczPlayerRef => ({ name: (id && names.get(id)) || "", id: id ? numericId(id) : null });
  const abbrevOf = (teamId: string | null) => (teamId === g.home_team_id ? home.abbrev : teamId === g.away_team_id ? away.abbrev : "");
  const side = (teamId: string) => (teamId === g.home_team_id ? "home" : "away");

  const box: HokejczMatch = {
    id: hczId,
    competition: game.leagueName,
    startLocal: startLocal(new Date(g.start_at)),
    round: g.round,
    home,
    away,
    homeScore: g.home_score,
    awayScore: g.away_score,
    statusLabel: final ? "Konec" : g.status_label,
    periods: g.periods ?? [],
    decidedIn: g.decided_in,
    series: g.series,
    attendance: g.attendance,
    venue: g.venue,
    capacity: g.capacity,
    referees: g.referees ?? [],
    linesmen: [],
    teamStats: g.team_stats ?? {},
    shotsByPeriod: [],
    goals: events
      .filter((e) => e.type === "goal")
      .map((e) => {
        const [scorer, ...assists] = e.player_ids ?? [];
        return {
          period: String(e.payload?.periodLabel ?? ""),
          time: String(e.payload?.time ?? ""),
          team: abbrevOf(e.team_id),
          scorer: ref(scorer),
          scorerSeasonGoals: null,
          assists: assists.map(ref),
          situation: e.situation ?? "",
          onIcePlus: ((e.payload?.onIcePlus as string[] | undefined) ?? []).map(ref),
          onIceMinus: ((e.payload?.onIceMinus as string[] | undefined) ?? []).map(ref),
        };
      }),
    penalties: events
      .filter((e) => e.type === "penalty")
      .map((e) => ({
        period: String(e.payload?.periodLabel ?? ""),
        time: String(e.payload?.time ?? ""),
        team: abbrevOf(e.team_id),
        player: ref(e.player_ids?.[0]),
        minutes: typeof e.payload?.minutes === "number" ? e.payload.minutes : null,
        reason: String(e.payload?.reason ?? ""),
      })),
    skaters: { home: [], away: [] },
    goalies: { home: [], away: [] },
  };
  for (const s of skaters) {
    box.skaters[side(s.team_id)].push({
      number: s.number,
      position: s.position ?? "",
      player: { name: s.name ?? "", id: numericId(s.player_id) },
      toiSeconds: s.toi_s,
      ppToiSeconds: s.pp_toi_s,
      shToiSeconds: s.sh_toi_s,
      goals: s.g ?? 0,
      assists: s.a ?? 0,
      points: s.pts ?? 0,
      pim: s.pim ?? 0,
      plusMinus: s.pm ?? 0,
      hits: s.hits ?? 0,
      shots: s.sog ?? 0,
      blocks: s.blk ?? 0,
      faceoffsWon: s.fo_w,
      faceoffsTaken: s.fo_taken,
      radegastIndex: s.ri,
    });
  }
  for (const k of goalies) {
    box.goalies[side(k.team_id)].push({
      number: k.number,
      player: { name: k.name ?? "", id: numericId(k.player_id) },
      toiSeconds: k.toi_s,
      saves: k.saves ?? 0,
      goalsAgainst: k.ga ?? 0,
      savePct: k.sv_pct === null ? null : Number(k.sv_pct),
      assists: k.extra?.assists ?? 0,
      pim: k.extra?.pim ?? 0,
    });
  }
  return { game, box };
}
