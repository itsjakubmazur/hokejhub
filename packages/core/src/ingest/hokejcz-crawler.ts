/**
 * Pure page → rows/jobs logic for the hokej.cz history crawler. The caller fetches HTML,
 * calls `processJob`, writes the returned rows and enqueues the returned jobs.
 */
import { pragueToUtcIso } from "../domain/time.ts";
import {
  hokejczPaths,
  parseHokejczMatch,
  parseHokejczSchedule,
  parseHokejczStandings,
  type HokejczCompetitionOption,
  type HokejczPlayerRef,
} from "../sources/hokejcz.ts";

export const LEAGUE_ID = "cz-elh";

export type CrawlKind = "season" | "schedule" | "round" | "match" | "table";

export interface CrawlJob {
  key: string;
  kind: CrawlKind;
  params: Record<string, unknown>;
  priority: number;
}

export interface Rows {
  competition: Record<string, unknown>[];
  season: Record<string, unknown>[];
  team: Record<string, unknown>[];
  player: Record<string, unknown>[];
  game: Record<string, unknown>[];
  game_event: Record<string, unknown>[];
  box_skater: Record<string, unknown>[];
  box_goalie: Record<string, unknown>[];
  standing_final: Record<string, unknown>[];
}

export const emptyRows = (): Rows => ({
  competition: [],
  season: [],
  team: [],
  player: [],
  game: [],
  game_event: [],
  box_skater: [],
  box_goalie: [],
  standing_final: [],
});

/** Order in which row groups must be written (foreign keys). */
export const WRITE_ORDER: (keyof Rows)[] = [
  "competition",
  "season",
  "team",
  "player",
  "game",
  "game_event",
  "box_skater",
  "box_goalie",
  "standing_final",
];

export const PRIMARY_KEYS: Record<keyof Rows, string> = {
  competition: "id",
  season: "id",
  team: "id",
  player: "id",
  game: "id",
  game_event: "game_id,seq",
  box_skater: "game_id,player_id",
  box_goalie: "game_id,player_id",
  standing_final: "league_id,season,split,team_name",
};

export const job = {
  season: (season: number): CrawlJob => ({ key: `hcz:season:${season}`, kind: "season", params: { season }, priority: 10 }),
  schedule: (season: number, c: HokejczCompetitionOption): CrawlJob => ({
    key: `hcz:schedule:${season}:${c.id}`,
    kind: "schedule",
    params: { season, competition: c.id, phase: c.phase },
    priority: 20,
  }),
  round: (season: number, competition: number, phase: string, round: number): CrawlJob => ({
    key: `hcz:round:${season}:${competition}:${round}`,
    kind: "round",
    params: { season, competition, phase, round },
    priority: 30,
  }),
  table: (season: number): CrawlJob => ({ key: `hcz:table:${season}`, kind: "table", params: { season }, priority: 40 }),
  match: (id: number, params: Record<string, unknown>): CrawlJob => ({
    key: `hcz:match:${id}`,
    kind: "match",
    params: { id, ...params },
    priority: 100,
  }),
};

/** Path (relative to the hokej.cz origin) a job needs to fetch. */
export function jobPath(j: Pick<CrawlJob, "kind" | "params">): string {
  const p = j.params as unknown as JobParams;
  switch (j.kind) {
    case "season":
      return `tipsport-extraliga/zapasy?matchList-filter-season=${p.season}`;
    case "schedule":
      // A whole regular season at once times out (504) — start with round 1, which also
      // lists the remaining rounds. Playoff / relegation pages are small enough.
      return j.params.phase === "regular"
        ? hokejczPaths.schedule(p.season, p.competition, 1)
        : hokejczPaths.schedule(p.season, p.competition);
    case "round":
      return hokejczPaths.schedule(p.season, p.competition, p.round);
    case "table":
      return hokejczPaths.table(p.season);
    case "match":
      return hokejczPaths.match(p.id);
  }
}

export const seasonId = (season: number) => `${LEAGUE_ID}-${season}`;
const seasonLabel = (season: number) => `${season}/${String((season + 1) % 100).padStart(2, "0")}`;

/** "David MUSIL" → "David Musil" (hokej.cz upper-cases surnames). */
export function niceName(name: string): string {
  return name.replace(/\p{Lu}{2,}/gu, (w) => w.charAt(0) + w.slice(1).toLocaleLowerCase("cs"));
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const playerId = (p: HokejczPlayerRef) => (p.id ? `hcz-${p.id}` : `hcz-n-${slug(p.name)}`);

function periodNumber(label: string): number | null {
  const m = /^(\d)\./.exec(label);
  if (m) return Number(m[1]);
  if (/prodlou/i.test(label)) return 4;
  if (/nájezd|nájezdy/i.test(label)) return 5;
  return null;
}

function elapsedSeconds(time: string): number | null {
  const m = /^(\d+):(\d{2})$/.exec(time.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function parseStartLocal(s: string | null): string | null {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(s ?? "");
  if (!m) return null;
  const date = `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return pragueToUtcIso(date, m[4] ? `${m[4].padStart(2, "0")}:${m[5]}` : "00:00");
}

interface JobParams {
  season: number;
  competition: number;
  phase: string;
  round: number;
  id: number;
  stage?: string | null;
  seriesLabel?: string | null;
}

export interface ProcessResult {
  rows: Rows;
  jobs: CrawlJob[];
}

export function processJob(j: Pick<CrawlJob, "kind" | "params">, html: string): ProcessResult {
  const rows = emptyRows();
  const jobs: CrawlJob[] = [];
  const p = j.params as unknown as JobParams;

  switch (j.kind) {
    case "season": {
      const page = parseHokejczSchedule(html, p.season);
      rows.season.push({ id: seasonId(p.season), league_id: LEAGUE_ID, label: seasonLabel(p.season) });
      for (const c of page.competitions) {
        rows.competition.push({ id: c.id, league_id: LEAGUE_ID, season: p.season, name: c.name, phase: c.phase });
        jobs.push(job.schedule(p.season, c));
      }
      jobs.push(job.table(p.season));
      break;
    }
    case "schedule":
    case "round": {
      const page = parseHokejczSchedule(html, p.season);
      if (j.kind === "schedule" && p.phase === "regular") {
        for (const r of page.rounds) if (r !== 1) jobs.push(job.round(p.season, p.competition, p.phase, r));
      }
      for (const m of page.matches) {
        jobs.push(
          job.match(m.id, {
            season: p.season,
            competition: p.competition,
            phase: p.phase,
            stage: m.stage,
            seriesLabel: m.seriesLabel,
          }),
        );
      }
      break;
    }
    case "table": {
      const t = parseHokejczStandings(html);
      for (const split of ["overall", "home", "away"] as const) {
        for (const r of t[split]) {
          rows.standing_final.push({
            league_id: LEAGUE_ID,
            season: p.season,
            split,
            rank: r.rank,
            team_name: r.team,
            gp: r.gp,
            w: r.w,
            otw: r.otw,
            ties: r.ties,
            otl: r.otl,
            l: r.l,
            gf: r.gf,
            ga: r.ga,
            pts: r.pts,
            raw: r.values,
          });
        }
      }
      break;
    }
    case "match": {
      const m = parseHokejczMatch(html, p.id);
      if (!m.home.name || !m.away.name) break;
      const teamId = (t: typeof m.home) => (t.clubId ? `hcz-${t.clubId}` : `hcz-n-${slug(t.abbrev || t.name)}`);
      const homeId = teamId(m.home);
      const awayId = teamId(m.away);
      for (const [id, t] of [
        [homeId, m.home],
        [awayId, m.away],
      ] as const) {
        rows.team.push({
          id,
          league_id: LEAGUE_ID,
          name: t.name,
          short_name: t.shortName || t.name,
          abbrev: t.abbrev,
          logo_url: t.logoUrl,
          external: { hokejczClubId: t.clubId },
        });
      }
      const gameId = `hcz-${m.id}`;
      const played = m.homeScore !== null && m.awayScore !== null && /konec/i.test(m.statusLabel ?? "");
      rows.game.push({
        id: gameId,
        source: "hokejcz",
        league_id: LEAGUE_ID,
        season_id: p.season ? seasonId(p.season) : null,
        start_at: parseStartLocal(m.startLocal) ?? new Date(0).toISOString(),
        home_team_id: homeId,
        away_team_id: awayId,
        home_name: m.home.name,
        away_name: m.away.name,
        phase: p.phase ?? null,
        competition_id: p.competition ?? null,
        round: m.round ?? p.stage ?? null,
        status: played ? "final" : m.homeScore !== null ? "live" : "scheduled",
        status_label: m.statusLabel,
        home_score: m.homeScore,
        away_score: m.awayScore,
        periods: m.periods,
        decided_in: played ? m.decidedIn : null,
        series: m.series,
        attendance: m.attendance,
        venue: m.venue,
        referees: m.referees.length ? m.referees : null,
        team_stats: Object.keys(m.teamStats).length ? m.teamStats : null,
        external: { hokejczId: m.id, stage: p.stage ?? null, seriesLabel: p.seriesLabel ?? null },
        updated_at: new Date().toISOString(),
      });

      const players = new Map<string, Record<string, unknown>>();
      const addPlayer = (ref: HokejczPlayerRef, position?: string) => {
        if (!ref.name) return null;
        const id = playerId(ref);
        if (!players.has(id))
          players.set(id, { id, name: niceName(ref.name), position: position ?? null, external: { hokejczId: ref.id } });
        return id;
      };
      const teamByAbbrev = (abbrev: string) =>
        abbrev === m.home.abbrev ? homeId : abbrev === m.away.abbrev ? awayId : null;

      let seq = 0;
      for (const g of m.goals) {
        const period = periodNumber(g.period);
        const elapsed = elapsedSeconds(g.time);
        rows.game_event.push({
          game_id: gameId,
          seq: seq++,
          type: "goal",
          period,
          period_seconds: elapsed !== null && period ? elapsed - (Math.min(period, 4) - 1) * 1200 : null,
          team_id: teamByAbbrev(g.team),
          player_ids: [addPlayer(g.scorer), ...g.assists.map((a) => addPlayer(a))].filter(Boolean),
          situation: g.situation,
          payload: { time: g.time, periodLabel: g.period, onIcePlus: g.onIcePlus.map(playerId), onIceMinus: g.onIceMinus.map(playerId) },
        });
      }
      for (const pen of m.penalties) {
        const period = periodNumber(pen.period);
        const elapsed = elapsedSeconds(pen.time);
        rows.game_event.push({
          game_id: gameId,
          seq: seq++,
          type: "penalty",
          period,
          period_seconds: elapsed !== null && period ? elapsed - (Math.min(period, 4) - 1) * 1200 : null,
          team_id: teamByAbbrev(pen.team),
          player_ids: [addPlayer(pen.player)].filter(Boolean),
          payload: { time: pen.time, periodLabel: pen.period, minutes: pen.minutes, reason: pen.reason },
        });
      }

      for (const side of ["home", "away"] as const) {
        const team_id = side === "home" ? homeId : awayId;
        const seen = new Set<string>();
        for (const s of m.skaters[side]) {
          const pid = addPlayer(s.player, s.position);
          if (!pid || seen.has(pid)) continue;
          seen.add(pid);
          rows.box_skater.push({
            game_id: gameId,
            player_id: pid,
            team_id,
            number: s.number,
            position: s.position,
            toi_s: s.toiSeconds,
            pp_toi_s: s.ppToiSeconds,
            sh_toi_s: s.shToiSeconds,
            g: s.goals,
            a: s.assists,
            pts: s.points,
            pim: s.pim,
            pm: s.plusMinus,
            hits: s.hits,
            sog: s.shots,
            blk: s.blocks,
            fo_w: s.faceoffsWon,
            fo_taken: s.faceoffsTaken,
            ri: s.radegastIndex,
          });
        }
        for (const gk of m.goalies[side]) {
          const pid = addPlayer(gk.player, "B");
          if (!pid || seen.has(pid)) continue;
          seen.add(pid);
          rows.box_goalie.push({
            game_id: gameId,
            player_id: pid,
            team_id,
            number: gk.number,
            toi_s: gk.toiSeconds,
            saves: gk.saves,
            ga: gk.goalsAgainst,
            sv_pct: gk.savePct,
            extra: { assists: gk.assists, pim: gk.pim },
          });
        }
      }
      rows.player.push(...players.values());
      break;
    }
  }
  return { rows, jobs };
}
