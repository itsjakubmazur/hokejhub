/**
 * Pure page → rows/jobs logic for the hokej.cz history crawler. The caller fetches HTML,
 * calls `processJob`, writes the returned rows and enqueues the returned jobs.
 */
import { pragueToUtcIso } from "../domain/time.ts";
import { parseHokejczShots, penaltyWindows, shotsWithXg } from "../sources/hokejcz-shots.ts";
import {
  hokejczPaths,
  isLeagueCompetition,
  parseHokejczMatch,
  parseHokejczPlayer,
  parseHokejczSchedule,
  parseHokejczStandings,
  type HokejczCompetitionOption,
  type HokejczPlayerRef,
} from "../sources/hokejcz.ts";

export const LEAGUE_ID = "cz-elh";

export type CrawlKind = "season" | "schedule" | "round" | "match" | "table" | "player";

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
  /** Name and crest from a game of the current season: the only rows that may change a team. */
  team_current: Record<string, unknown>[];
  /** The crest a club wore in a season, from its match pages. */
  team_season_logo: Record<string, unknown>[];
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
  team_current: [],
  team_season_logo: [],
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
  "team_current",
  "team_season_logo",
];

/** Table each row group is written to, where it differs from the group's name. */
export const TABLE_OF: Partial<Record<keyof Rows, string>> = { team_current: "team" };

/**
 * Groups written insert-only: a team row from an old match page must not rename the club or
 * swap its crest for the one it wore back then.
 */
export const INSERT_ONLY: (keyof Rows)[] = ["team"];

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
  team_current: "id",
  team_season_logo: "team_id,league_id,season",
};

/** Season (start year) of a date: July onwards belongs to the season starting that year. */
export function seasonOfDate(d: Date = new Date()): number {
  return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}

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
  player: (id: number): CrawlJob => ({ key: `hcz:player:${id}`, kind: "player", params: { id }, priority: 120 }),
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
    case "player":
      return `hrac/x/${p.id}`;
  }
}

/**
 * hokej.cz lists 1992/93 among the extraliga seasons, but it was the last Czechoslovak league
 * (with Slovak clubs); the extraliga starts in 1993/94. Its games are kept under their own league.
 */
export const CS_LEAGUE_ID = "cs-liga";
export const leagueOf = (season: number | null | undefined) => (season != null && season < 1993 ? CS_LEAGUE_ID : LEAGUE_ID);
export const seasonId = (season: number) => `${leagueOf(season)}-${season}`;
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

/** Box score / profile position codes → G (goalie), D (defence), F (forward). */
export function normPosition(pos: string | null | undefined): "G" | "D" | "F" | null {
  const p = (pos ?? "").toUpperCase();
  if (p === "B" || p === "G" || p === "GK") return "G";
  if (p === "O" || p === "D" || p === "BK") return "D";
  if (p === "Ú" || p === "F" || p === "FW" || p === "FO") return "F";
  return null;
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

/**
 * @param shotsJson for match jobs: the hokej.cz shot feed (`hokejczShotsUrl`), when available.
 */
export function processJob(j: Pick<CrawlJob, "kind" | "params">, html: string, shotsJson?: unknown): ProcessResult {
  const rows = emptyRows();
  const jobs: CrawlJob[] = [];
  const p = j.params as unknown as JobParams;

  switch (j.kind) {
    case "season": {
      const page = parseHokejczSchedule(html, p.season);
      rows.season.push({ id: seasonId(p.season), league_id: leagueOf(p.season), label: seasonLabel(p.season) });
      for (const c of page.competitions) {
        if (!isLeagueCompetition(c.name)) continue;
        rows.competition.push({ id: c.id, league_id: leagueOf(p.season), season: p.season, name: c.name, phase: c.phase });
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
            league_id: leagueOf(p.season),
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
        const team = {
          id,
          league_id: LEAGUE_ID,
          name: t.name,
          short_name: t.shortName || t.name,
          abbrev: t.abbrev,
          logo_url: t.logoUrl,
          external: { hokejczClubId: t.clubId },
        };
        rows.team.push(team);
        if (p.season != null && p.season >= seasonOfDate()) rows.team_current.push(team);
        if (p.season != null && t.logoUrl)
          rows.team_season_logo.push({ team_id: id, league_id: leagueOf(p.season), season: p.season, logo_url: t.logoUrl, name: t.name });
      }
      const gameId = `hcz-${m.id}`;
      // A forfeit ("Kontumováno") is a finished game with the awarded 5:0; the box score of the
      // game as played stays, as in the official statistics.
      const forfeit = /kontum/i.test(m.statusLabel ?? "");
      const played = m.homeScore !== null && m.awayScore !== null && (forfeit || /konec/i.test(m.statusLabel ?? ""));
      rows.game.push({
        id: gameId,
        source: "hokejcz",
        league_id: leagueOf(p.season),
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
        decided_in: played ? (forfeit ? "REG" : m.decidedIn) : null,
        series: m.series,
        attendance: m.attendance,
        capacity: m.capacity,
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
        const existing = players.get(id);
        const pos = normPosition(position);
        if (!existing) players.set(id, { id, name: niceName(ref.name), position: pos, external: { hokejczId: ref.id } });
        else if (pos && !existing.position) existing.position = pos;
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
      if (shotsJson) {
        const feed = parseHokejczShots(shotsJson);
        const shots = shotsWithXg(feed, penaltyWindows(m.penalties, m.home.abbrev));
        const xg: [number, number] = [0, 0];
        for (const s of shots) {
          xg[s.isHome ? 0 : 1] += s.xg;
          rows.game_event.push({
            game_id: gameId,
            seq: 1000 + seq++,
            type: "shot",
            period: s.period,
            period_seconds: s.periodSeconds,
            team_id: s.isHome ? homeId : awayId,
            player_ids: s.playerId ? [addPlayer({ id: s.playerId, name: s.name })] : [],
            x: s.x,
            y: s.y,
            xg: Math.round(s.xg * 10000) / 10000,
            situation: s.strength,
            payload: { result: s.result, elapsed: s.elapsed, jersey: s.jersey },
          });
        }
        const game = rows.game[0]!;
        game.team_stats = { ...((game.team_stats as object) ?? {}), xG: xg.map((v) => Math.round(v * 100) / 100) };
        if (feed.faceoffZones) game.external = { ...(game.external as object), faceoffZones: feed.faceoffZones };
      }
      rows.player.push(...players.values());
      for (const pl of players.values()) {
        const hid = (pl.external as { hokejczId: number | null }).hokejczId;
        if (hid) jobs.push(job.player(hid));
      }
      break;
    }
    case "player": {
      const prof = parseHokejczPlayer(html, p.id);
      if (!prof.name) break;
      rows.player.push({
        id: `hcz-${p.id}`,
        name: prof.name,
        headshot: prof.photoUrl,
        birth_date: prof.birthDate,
        position: prof.position,
        shoots: prof.shoots,
        height_cm: prof.heightCm,
        weight_kg: prof.weightKg,
        current_team_id: prof.clubId ? `hcz-${prof.clubId}` : null,
        external: { hokejczId: p.id },
      });
      break;
    }
  }
  return { rows, jobs };
}
