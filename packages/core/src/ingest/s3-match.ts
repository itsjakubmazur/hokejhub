/**
 * Box score of an extraliga game from the JSON files hokej.cz itself loads from S3, for when the
 * hokej.cz match page cannot be read (it refuses datacenter addresses, GitHub's runners included):
 *
 *  - onlajny player stats → skater lines (TOI, +/−, hits, blocks, face-offs, Radegast index)
 *  - onlajny roster       → goalies (saves, goals against) and referees
 *  - onlajny summary      → team statistics, and hokej.cz ids of each team's leaders
 *  - hokej.cz commentary  → goals (scorer, assists, players on ice) and penalties
 *  - hokej.cz shot feed   → shots with coordinates (xG), hokej.cz ids of the shooters
 *
 * The rows have the shape the match-page crawler writes. Players carry hokej.cz ids
 * (`hcz-{id}`) like everywhere else: onlajny and the commentary use ids of their own, so each
 * player is matched to his hokej.cz id through the summary, the shot feed (same game, same
 * jersey) or players the database already knows on that team; whoever is left gets the
 * name-based id the crawler uses for players without a link.
 * What the match page has and these files do not: power-play / short-handed TOI, the exact TOI
 * of a goalie pulled for an extra attacker, attendance and venue.
 */
import { parseHokejczShots, penaltyWindows, shotsWithXg } from "../sources/hokejcz-shots.ts";
import { emptyRows, normPosition, type Rows } from "./hokejcz-crawler.ts";

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : v && typeof v === "object" ? [v] : []);
const attrs = (v: unknown) => obj(obj(v)["@attributes"]);
const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v)).trim();

/** Lower case, no diacritics, single spaces: for comparing names across sources. */
export function normName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
const slug = (s: string) => normName(s).replace(/ /g, "-");

/** Levenshtein distance, for surnames spelled differently by two sources. */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length]!;
}

export interface KnownPlayer {
  /** hokej.cz-based player id, e.g. `hcz-10842`. */
  id: string;
  teamId: string;
  name: string;
  number: number | null;
}

export interface S3MatchInput {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  /** "REG" | "OT" | "SO" — sets the length of the game for the goalies' time on ice. */
  decidedIn?: string | null;
  playerStats: unknown;
  summary: unknown;
  roster: unknown;
  shots?: unknown;
  online?: unknown;
  /** Players the database already has on these two teams (recent box scores). */
  known?: KnownPlayer[];
}

export interface S3MatchResult {
  rows: Rows;
  /** Columns of the game row to update (the result itself comes from the live feed). */
  game: { team_stats: Record<string, [number, number]>; referees: string[] | null; external: Record<string, unknown> };
  /** Players that got a name-based id because no hokej.cz id was found. */
  unresolved: string[];
}

type Side = "home" | "away";

interface Entry {
  side: Side;
  jersey: number | null;
  first: string;
  surname: string;
  position: string;
  id: string;
  hokejczId: number | null;
}

const BENCH = { id: "hcz-n-hracska-lavice", name: "Hráčská lavice" };

/** Seconds from "mm:ss" game time. */
function elapsedOf(t: string): number | null {
  const m = /^(\d+):(\d{2})$/.exec(t.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function periodOf(elapsed: number): number {
  return Math.min(Math.floor(Math.max(elapsed - 1, 0) / 1200) + 1, 4);
}

const periodLabel = (p: number) => (p <= 3 ? `${p}. třetina` : "prodloužení");

/** Whether the database name (hokej.cz, may drop middle names) is this player. */
function sameName(dbName: string, first: string, surname: string): boolean {
  const n = normName(dbName);
  const s = normName(surname);
  if (!s || !(n === s || n.endsWith(` ${s}`))) return false;
  const f = normName(first).split(" ")[0];
  return !f || n.startsWith(f.charAt(0));
}

export function processS3Match(input: S3MatchInput): S3MatchResult {
  const rows = emptyRows();
  const teamOf = (side: Side) => (side === "home" ? input.homeTeamId : input.awayTeamId);
  const other = (side: Side): Side => (side === "home" ? "away" : "home");

  const statsRaw = obj(input.playerStats);
  const summary = obj(input.summary);
  const roster = obj(input.roster);
  const rosters = obj(roster.rosters);
  const shotsRaw = obj(obj(input.shots).match);
  const feed = input.shots ? (() => { try { return parseHokejczShots(input.shots); } catch { return null; } })() : null;

  // ---- hokej.cz ids: summary leaders, shooters of this game, players already known ----
  const leaders = new Map<number, number>();
  for (const s of ["home", "visitor"]) {
    const t = obj(summary[s]);
    for (const p of [...arr(t.players), ...arr(t.goalkeepers)]) {
      const o = obj(p);
      if (num(o.hokejcz_id)) leaders.set(num(o.id), num(o.hokejcz_id));
    }
  }
  const shooters = new Map<string, { id: number; last: string }>();
  for (const s of arr(shotsRaw.shots)) {
    const o = obj(s);
    if (!num(o.player_id) || o.jersey == null) continue;
    const side: Side = num(o.team_id) === num(shotsRaw.home_id) ? "home" : "away";
    shooters.set(`${side}:${num(o.jersey)}`, { id: num(o.player_id), last: str(o.last_name) });
  }
  const known = input.known ?? [];
  const unresolved: string[] = [];

  const resolve = (side: Side, onlajnyId: number, jersey: number | null, first: string, surname: string): { id: string; hokejczId: number | null } => {
    const lead = leaders.get(onlajnyId);
    if (lead) return { id: `hcz-${lead}`, hokejczId: lead };
    const shot = jersey != null ? shooters.get(`${side}:${jersey}`) : undefined;
    if (shot && normName(shot.last) === normName(surname)) return { id: `hcz-${shot.id}`, hokejczId: shot.id };
    const team = known.filter((k) => k.teamId === teamOf(side) && sameName(k.name, first, surname));
    const hit = team.find((k) => k.number === jersey) ?? (team.length === 1 ? team[0] : undefined);
    if (hit) {
      const m = /^hcz-(\d+)$/.exec(hit.id);
      return { id: hit.id, hokejczId: m ? Number(m[1]) : null };
    }
    const name = `${first} ${surname}`.trim();
    unresolved.push(name);
    return { id: `hcz-n-${slug(name)}`, hokejczId: null };
  };

  // ---- everyone who dressed: skaters from the player stats, goalies from the roster ----
  const entries: Entry[] = [];
  const skaterLines: { e: Entry; r: Json }[] = [];
  for (const [key, side] of [["home", "home"], ["guest", "away"]] as const) {
    for (const x of arr(statsRaw[key])) {
      const r = obj(x);
      const jersey = r.jersey != null ? num(r.jersey) : null;
      const first = str(r.name);
      const surname = str(r.surname);
      const pos = str(r.position).toUpperCase() === "U" ? "Ú" : str(r.position).toUpperCase() || "Ú";
      const e: Entry = { side, jersey, first, surname, position: pos, ...resolve(side, num(r.id), jersey, first, surname) };
      entries.push(e);
      skaterLines.push({ e, r });
    }
  }
  const goalieLines: { e: Entry; r: Json }[] = [];
  for (const [key, side] of [["home", "home"], ["guest", "away"]] as const) {
    for (const [slot, v] of Object.entries(obj(rosters[key])).sort(([a], [b]) => a.localeCompare(b))) {
      const r = obj(v);
      if (!slot.startsWith("1") && str(r.position).toUpperCase() !== "GK") continue;
      const jersey = r.jersey != null ? num(r.jersey) : null;
      const first = str(r.name);
      const surname = str(r.surname);
      const e: Entry = { side, jersey, first, surname, position: "B", ...resolve(side, num(r.id), jersey, first, surname) };
      entries.push(e);
      goalieLines.push({ e, r });
    }
  }

  const players = new Map<string, Record<string, unknown>>();
  for (const e of entries) {
    if (!players.has(e.id))
      players.set(e.id, { id: e.id, name: `${e.first} ${e.surname}`.trim(), position: normPosition(e.position), external: { hokejczId: e.hokejczId } });
  }
  /**
   * Players of a team whose surname matches one written in the commentary — exactly, else
   * within two letters (transliterations: "Merežko" there, "Merezhko" in the statistics).
   */
  const candidates = (side: Side, surname: string): Entry[] => {
    const s = normName(surname);
    if (!s) return [];
    const team = entries.filter((e) => e.side === side);
    const exact = team.filter((e) => normName(e.surname) === s);
    if (exact.length) return exact;
    const near = team.filter((e) => editDistance(normName(e.surname), s) <= 2);
    return near.length === 1 ? near : [];
  };
  /** A player named with his first name (scorer, assists, penalised player). */
  const byName = (side: Side, first: string, surname: string): Entry | null => {
    const list = candidates(side, surname);
    if (list.length <= 1) return list[0] ?? null;
    const f = normName(first);
    return list.find((e) => normName(e.first) === f) ?? list.find((e) => f && normName(e.first).split(" ")[0] === f.split(" ")[0]) ?? null;
  };
  const goalieSurnames = (side: Side) => new Set(goalieLines.filter((g) => g.e.side === side).map((g) => normName(g.e.surname)));

  // ---- commentary: which code is which team ----
  const comments = arr(obj(obj(input.online).comments).comment).map(obj);
  const codeSide = new Map<string, Side>();
  if (str(shotsRaw.home_shortcut)) codeSide.set(str(shotsRaw.home_shortcut), "home");
  if (str(shotsRaw.visitor_shortcut)) codeSide.set(str(shotsRaw.visitor_shortcut), "away");
  const timed = comments
    .map((c) => ({ c, a: attrs(c), elapsed: elapsedOf(str(c.time)) }))
    .filter((x): x is { c: Json; a: Json; elapsed: number } => x.elapsed !== null)
    .sort((x, y) => x.elapsed - y.elapsed || num(x.a.order) - num(y.a.order));
  {
    // Goals in order: the side whose score went up is the scoring code's side.
    let prev: [number, number] = [0, 0];
    for (const { c, a } of timed.filter((x) => x.a.label === "goal")) {
      const score: [number, number] = [num(a.score1), num(a.score2)];
      const code = str(attrs(obj(obj(c.details).detail).opponent).code);
      if (code && !codeSide.has(code)) {
        if (score[0] > prev[0] && score[1] === prev[1]) codeSide.set(code, "home");
        else if (score[1] > prev[1] && score[0] === prev[0]) codeSide.set(code, "away");
      }
      prev = score;
    }
    // One code known → the other one is the other team.
    const codes = new Set(timed.map((x) => str(attrs(obj(obj(x.c.details).detail).opponent).code)).filter(Boolean));
    for (const code of codes) {
      if (codeSide.has(code)) continue;
      const taken = [...codeSide.values()];
      if (taken.length === 1) codeSide.set(code, other(taken[0]!));
    }
  }

  // The commentary's own player ids, learned where it names a player in full (scorer, assists,
  // penalties); the players-on-ice lists give surnames only.
  const learned = new Map<string, Entry>();
  for (const { c, a } of timed) {
    if (a.label !== "goal" && a.label !== "penalty") continue;
    const detail = obj(obj(c.details).detail);
    const side = codeSide.get(str(attrs(detail.opponent).code));
    if (!side) continue;
    for (const k of ["player1", "player2", "player3"]) {
      const p = attrs(detail[k]);
      const e = num(p.id) ? byName(side, str(p.firstname), str(p.surname) || str(p.name)) : null;
      if (e) learned.set(`${side}:${num(p.id)}`, e);
    }
  }
  /** Players on ice for one team at a goal, as entries (unknown or ambiguous ones left out). */
  const onIceOf = (side: Side, team: Json): Entry[] => {
    const listed = Object.keys(team)
      .filter((k) => k.startsWith("player"))
      .map((k) => attrs(team[k]))
      .filter((p) => num(p.id))
      .map((p) => ({ id: num(p.id), surname: str(p.surname) || str(p.name) }));
    const taken = new Set([...learned.entries()].map(([, e]) => e));
    const out: Entry[] = [];
    const open: typeof listed = [];
    for (const p of listed) {
      const hit = learned.get(`${side}:${p.id}`);
      if (hit) out.push(hit);
      else open.push(p);
    }
    for (const p of open) {
      const left = candidates(side, p.surname).filter((e) => !taken.has(e) && !out.includes(e));
      if (left.length === 1) {
        out.push(left[0]!);
        learned.set(`${side}:${p.id}`, left[0]!);
        continue;
      }
      // Brothers on ice together: both of them are there, whichever is which.
      const same = open.filter((q) => normName(q.surname) === normName(p.surname));
      if (left.length > 1 && same.length === left.length) for (const e of left) if (!out.includes(e)) out.push(e);
    }
    return out;
  };

  let seq = 0;
  const penalties: { time: string; team: string; minutes: number; side: Side; playerId: string }[] = [];
  const goalEvents: { elapsed: number; side: Side; row: Record<string, unknown>; ids: string[]; strength: string }[] = [];
  const lastElapsed = timed.length ? timed[timed.length - 1]!.elapsed : 0;

  for (const { c, a, elapsed } of timed) {
    const label = str(a.label);
    if (label !== "goal" && label !== "penalty") continue;
    if (elapsed >= 3900) continue; // shootout attempts are not goals of the game
    const detail = obj(obj(c.details).detail);
    const side = codeSide.get(str(attrs(detail.opponent).code));
    if (!side) continue;
    const named = (k: string) => {
      const p = attrs(detail[k]);
      return num(p.id) ? byName(side, str(p.firstname), str(p.surname) || str(p.name)) : null;
    };
    const period = periodOf(elapsed);
    const base = { period, period_seconds: elapsed - (period - 1) * 1200, team_id: teamOf(side) };
    if (label === "goal") {
      const scorer = named("player1");
      const assists = [named("player2"), named("player3")].filter((x): x is Entry => !!x);
      const onField = obj(obj(c.details).on_field);
      const listedOf = (s: Side) => {
        for (const k of ["opponent1", "opponent2"]) {
          const team = obj(onField[k]);
          if (codeSide.get(str(attrs(team).code)) === s) return team;
        }
        return null;
      };
      // Counted from the lists as written (also players we could not match), goalie aside.
      const count = (team: Json | null, s: Side) => {
        const names = Object.keys(team ?? {})
          .filter((k) => k.startsWith("player"))
          .map((k) => attrs(team![k]))
          .filter((p) => num(p.id))
          .map((p) => normName(str(p.surname) || str(p.name)));
        const goalie = names.some((n) => goalieSurnames(s).has(n));
        return { skaters: names.length - (goalie ? 1 : 0), goalie, any: names.length > 0 };
      };
      const plusTeam = listedOf(side);
      const minusTeam = listedOf(other(side));
      const plus = plusTeam ? onIceOf(side, plusTeam) : [];
      const minus = minusTeam ? onIceOf(other(side), minusTeam) : [];
      let situation = "";
      const sc = count(plusTeam, side);
      const co = count(minusTeam, other(side));
      if (sc.any && co.any) situation = !co.goalie ? "EN" : `${sc.skaters}/${co.skaters}`;
      const row = {
        game_id: input.gameId,
        seq: 0,
        type: "goal",
        ...base,
        player_ids: [scorer?.id ?? null, ...assists.map((x) => x.id)].filter(Boolean),
        situation,
        payload: {
          time: str(c.time),
          periodLabel: periodLabel(period),
          onIcePlus: plus.map((e) => e.id),
          onIceMinus: minus.map((e) => e.id),
        },
      };
      goalEvents.push({ elapsed, side, row, ids: [scorer?.id ?? "", ...assists.map((x) => x.id)], strength: situation });
    } else {
      const who = named("player1");
      const playerId = who?.id ?? BENCH.id;
      if (!who) players.set(BENCH.id, { id: BENCH.id, name: BENCH.name, position: null, external: { hokejczId: null } });
      const pen = obj(obj(detail.player1).penalties);
      const minutes = num(attrs(arr(pen.penalty)[0]).length);
      const message = str(c.message).replace(/<br\s*\/?>/gi, "\n");
      // "Jakub Jeřábek – 2 min., vysoká hůl." or, for the bench,
      // "2 min. – příliš mnoho hráčů na ledě, odpyká Matěj Kubiesa."
      const player = /\d+\s*min\.?,\s*([^\n]+?)\.?\s*$/m.exec(message)?.[1]?.trim();
      const bench = /\d+\s*min\.\s*[–-]\s*([^\n]+?)(?:,\s*odpyká\s+([^\n]+?))?\.?\s*$/m.exec(message);
      const reason =
        (who ? player : null) ??
        (bench ? (bench[2] ? `${bench[1]!.trim()} (${bench[2].trim()})` : bench[1]!.trim()) : null) ??
        player ??
        str(attrs(arr(pen.penalty)[0]).offense);
      penalties.push({ time: str(c.time), team: side === "home" ? "H" : "A", minutes, side, playerId });
      rows.game_event.push({
        game_id: input.gameId,
        seq: 0,
        type: "penalty",
        ...base,
        player_ids: [playerId],
        payload: { time: str(c.time), periodLabel: periodLabel(period), minutes: minutes || null, reason },
      });
    }
  }
  // Goals first, then penalties, each in game order — as the match page lists them.
  const penaltyRows = rows.game_event.splice(0);
  for (const g of goalEvents) rows.game_event.push({ ...g.row, seq: seq++ });
  for (const p of penaltyRows) rows.game_event.push({ ...p, seq: seq++ });

  // ---- box score ----
  for (const { e, r } of skaterLines) {
    const fo = num(r.faceoffs);
    rows.box_skater.push({
      game_id: input.gameId,
      player_id: e.id,
      team_id: teamOf(e.side),
      number: e.jersey,
      position: e.position,
      toi_s: num(r.time_on_ice) || null,
      pp_toi_s: null,
      sh_toi_s: null,
      g: num(r.goals),
      a: num(r.assistance),
      pts: num(r.points),
      pim: num(r.penalty_minutes),
      pm: num(r.plus_minus),
      hits: num(r.hits),
      sog: num(r.shots),
      blk: num(r.blocked_shots),
      fo_w: fo ? num(r.faceoffs_win) : null,
      fo_taken: fo ? fo : null,
      // No index for a player who did not get on the ice, as on the match page.
      ri: r.radegast_index == null || !num(r.time_on_ice) ? null : num(r.radegast_index),
    });
  }
  const goalLength =
    input.decidedIn === "SO" ? 3900 : input.decidedIn === "OT" ? Math.max(3600, ...goalEvents.map((g) => g.elapsed)) : Math.max(3600, Math.min(lastElapsed, 3600));
  for (const side of ["home", "away"] as const) {
    const mine = goalieLines.filter((g) => g.e.side === side);
    const played = mine.filter(({ r }) => num(obj(r.saves).total) + num(obj(r.obtained).total) > 0);
    for (const { e, r } of mine) {
      const saves = num(obj(r.saves).total);
      const ga = num(obj(r.obtained).total);
      rows.box_goalie.push({
        game_id: input.gameId,
        player_id: e.id,
        team_id: teamOf(side),
        number: e.jersey,
        toi_s: played.length === 1 && played[0]!.e === e ? goalLength : null,
        saves,
        ga,
        sv_pct: saves + ga > 0 ? Math.round((saves / (saves + ga)) * 10000) / 100 : null,
        extra: {
          assists: goalEvents.filter((g) => g.ids.slice(1).includes(e.id)).length,
          pim: penalties.filter((p) => p.playerId === e.id).reduce((n, p) => n + p.minutes, 0),
        },
      });
    }
  }

  // ---- team statistics, labelled as on the match page ----
  const h = obj(summary.home);
  const v = obj(summary.visitor);
  const total = (t: Json, k: string) => num(obj(t[k]).total);
  const pair = (k: string): [number, number] => [total(h, k), total(v, k)];
  const bySide = (f: (s: Side) => number): [number, number] => [f("home"), f("away")];
  const shotsOnGoal = pair("shots");
  const goals = pair("goals");
  const skaters = (s: string) => s.split("/").map(Number) as [number, number];
  const teamStats: Record<string, [number, number]> = {
    Vyloučení: bySide((s) => penalties.filter((p) => p.side === s).length),
    "Vyšší tresty": bySide((s) => penalties.filter((p) => p.side === s && p.minutes >= 5).length),
    Využití: bySide((s) => goalEvents.filter((g) => g.side === s && /^\d\/\d$/.test(g.strength) && skaters(g.strength)[0] > skaters(g.strength)[1]).length),
    "V oslabení": bySide((s) => goalEvents.filter((g) => g.side === s && /^\d\/\d$/.test(g.strength) && skaters(g.strength)[0] < skaters(g.strength)[1]).length),
    "Střely na branku": shotsOnGoal,
    "Zblokované střely": pair("blocked_shots"),
    "Zásahy brankářů": [shotsOnGoal[1] - goals[1], shotsOnGoal[0] - goals[0]],
    Hity: pair("hits"),
    Bloky: pair("shots_blocked_by_team"),
    Vhazování: [num(obj(obj(h.faceoffs).total).win), num(obj(obj(v.faceoffs).total).win)],
    "Trestné minuty": [Math.round(total(h, "penalty_seconds") / 60), Math.round(total(v, "penalty_seconds") / 60)],
    "Radegast index": bySide((s) => skaterLines.filter((l) => l.e.side === s).reduce((n, l) => n + num(l.r.radegast_index), 0)),
  };
  const external: Record<string, unknown> = { boxScoreSource: "s3" };

  // ---- shots with xG ----
  if (feed) {
    const shots = shotsWithXg(feed, penaltyWindows(penalties, "H"));
    const xg: [number, number] = [0, 0];
    for (const s of shots) {
      xg[s.isHome ? 0 : 1] += s.xg;
      let pid: string | null = null;
      if (s.playerId) {
        pid = `hcz-${s.playerId}`;
        if (!players.has(pid)) players.set(pid, { id: pid, name: s.name, position: null, external: { hokejczId: s.playerId } });
      }
      rows.game_event.push({
        game_id: input.gameId,
        seq: 1000 + seq++,
        type: "shot",
        period: s.period,
        period_seconds: s.periodSeconds,
        team_id: s.isHome ? input.homeTeamId : input.awayTeamId,
        player_ids: pid ? [pid] : [],
        x: s.x,
        y: s.y,
        xg: Math.round(s.xg * 10000) / 10000,
        situation: s.strength,
        payload: { result: s.result, elapsed: s.elapsed, jersey: s.jersey },
      });
    }
    teamStats.xG = xg.map((x) => Math.round(x * 100) / 100) as [number, number];
    if (feed.faceoffZones) external.faceoffZones = feed.faceoffZones;
  }

  const referees = arr(roster.referees)
    .map(obj)
    .filter((r) => str(r.type).startsWith("hlavni"))
    .map((r) => `${str(r.name)} ${str(r.surname)}`.trim())
    .filter(Boolean);

  rows.player.push(...players.values());
  return { rows, game: { team_stats: teamStats, referees: referees.length ? referees : null, external }, unresolved };
}
