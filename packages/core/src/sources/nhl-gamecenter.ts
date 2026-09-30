/**
 * NHL gamecenter extras beyond the landing summary: boxscore player stats, right-rail team stats,
 * officials/coaches/scratches, three stars, penalties, season series and the pre-game matchup.
 * Parsed leniently (plain property access): the api-web payloads drift between seasons.
 */

type J = Record<string, unknown>;
const o = (v: unknown): J => (v && typeof v === "object" ? (v as J) : {});
const a = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const s = (v: unknown): string => (typeof v === "string" ? v : "");
const loc = (v: unknown): string => {
  const x = o(v);
  return s(x.cs) || s(x.default);
};
const fullName = (p: unknown) => {
  const x = o(p);
  return loc(x.name) || loc(x.fullName) || [loc(x.firstName), loc(x.lastName)].filter(Boolean).join(" ");
};

export const nhlGamecenterUrls = {
  rightRail: (gameId: number) => `https://api-web.nhle.com/v1/gamecenter/${gameId}/right-rail`,
};

/** Mugshot URL for a player on a team in a season (e.g. 20252026). */
export const nhlHeadshot = (season: number | string, team: string, playerId: number) =>
  `https://assets.nhle.com/mugs/nhl/${season}/${team}/${playerId}.png`;

export interface NhlSkaterLine {
  id: number;
  number: number | null;
  name: string;
  position: string;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  pim: number;
  hits: number;
  sog: number;
  blocks: number;
  ppGoals: number;
  foPct: number | null;
  toi: string;
  shifts: number;
  giveaways: number;
  takeaways: number;
  headshot: string;
}

export interface NhlGoalieLine {
  id: number;
  number: number | null;
  name: string;
  toi: string;
  shotsAgainst: number;
  saves: number;
  goalsAgainst: number;
  savePct: number | null;
  evenStrength: string;
  powerPlay: string;
  shortHanded: string;
  decision: string | null;
  starter: boolean;
  headshot: string;
}

export interface NhlBoxscore {
  season: number;
  skaters: { home: NhlSkaterLine[]; away: NhlSkaterLine[] };
  goalies: { home: NhlGoalieLine[]; away: NhlGoalieLine[] };
}

export function parseNhlBoxscore(json: unknown): NhlBoxscore {
  const root = o(json);
  const season = n(root.season) ?? 0;
  const stats = o(root.playerByGameStats);
  const abbr = { home: s(o(root.homeTeam).abbrev), away: s(o(root.awayTeam).abbrev) };
  const side = (k: "home" | "away") => {
    const t = o(stats[k === "home" ? "homeTeam" : "awayTeam"]);
    const skaters: NhlSkaterLine[] = [...a(t.forwards), ...a(t.defense)].map((p) => {
      const x = o(p);
      const id = n(x.playerId) ?? 0;
      return {
        id,
        number: n(x.sweaterNumber),
        name: loc(x.name),
        position: s(x.position),
        goals: n(x.goals) ?? 0,
        assists: n(x.assists) ?? 0,
        points: n(x.points) ?? 0,
        plusMinus: n(x.plusMinus) ?? 0,
        pim: n(x.pim) ?? 0,
        hits: n(x.hits) ?? 0,
        sog: n(x.sog) ?? 0,
        blocks: n(x.blockedShots) ?? 0,
        ppGoals: n(x.powerPlayGoals) ?? 0,
        foPct: n(x.faceoffWinningPctg),
        toi: s(x.toi),
        shifts: n(x.shifts) ?? 0,
        giveaways: n(x.giveaways) ?? 0,
        takeaways: n(x.takeaways) ?? 0,
        headshot: nhlHeadshot(season, abbr[k], id),
      };
    });
    const goalies: NhlGoalieLine[] = a(t.goalies)
      .map((p) => {
        const x = o(p);
        const id = n(x.playerId) ?? 0;
        return {
          id,
          number: n(x.sweaterNumber),
          name: loc(x.name),
          toi: s(x.toi),
          shotsAgainst: n(x.shotsAgainst) ?? 0,
          saves: n(x.saves) ?? 0,
          goalsAgainst: n(x.goalsAgainst) ?? 0,
          savePct: n(x.savePctg),
          evenStrength: s(x.evenStrengthShotsAgainst),
          powerPlay: s(x.powerPlayShotsAgainst),
          shortHanded: s(x.shorthandedShotsAgainst),
          decision: s(x.decision) || null,
          starter: x.starter === true,
          headshot: nhlHeadshot(season, abbr[k], id),
        };
      })
      .filter((g) => g.toi && g.toi !== "00:00");
    return { skaters, goalies };
  };
  const h = side("home");
  const w = side("away");
  return { season, skaters: { home: h.skaters, away: w.skaters }, goalies: { home: h.goalies, away: w.goalies } };
}

export interface NhlTeamStat {
  key: string;
  label: string;
  home: number;
  away: number;
  /** Display strings when the stat is a ratio ("1/2") or a percentage. */
  homeText: string;
  awayText: string;
}

const TEAM_STAT_LABELS: Record<string, string> = {
  sog: "Střely na branku",
  faceoffWinningPctg: "Vyhraná buly",
  powerPlay: "Přesilovky (góly / počet)",
  pim: "Trestné minuty",
  hits: "Hity",
  blockedShots: "Zblokované střely",
  giveaways: "Ztráty puku",
  takeaways: "Zisky puku",
};

export interface NhlRightRail {
  teamStats: NhlTeamStat[];
  referees: string[];
  linesmen: string[];
  coaches: { home: string | null; away: string | null };
  scratches: { home: string[]; away: string[] };
  seasonSeries: { id: number; date: string; state: string; homeAbbrev: string; awayAbbrev: string; homeScore: number | null; awayScore: number | null }[];
  seriesWins: { home: number; away: number } | null;
  /** Pre-game season profile of both teams. */
  teamSeason: {
    home: NhlTeamSeason;
    away: NhlTeamSeason;
  } | null;
}

export interface NhlTeamSeason {
  ppPct: number | null;
  pkPct: number | null;
  foPct: number | null;
  gfPerGame: number | null;
  gaPerGame: number | null;
  ranks: { pp: number | null; pk: number | null; fo: number | null; gf: number | null; ga: number | null };
}

export function parseNhlRightRail(json: unknown): NhlRightRail {
  const root = o(json);
  const teamStats: NhlTeamStat[] = [];
  for (const raw of a(root.teamGameStats)) {
    const x = o(raw);
    const key = s(x.category);
    if (!TEAM_STAT_LABELS[key]) continue;
    const pct = key.endsWith("Pctg");
    const ratio = (v: unknown) => {
      const m = /^(\d+)\/(\d+)$/.exec(s(v));
      return m ? Number(m[1]) : n(v) ?? 0;
    };
    const hv = pct ? (n(x.homeValue) ?? 0) * 100 : ratio(x.homeValue);
    const av = pct ? (n(x.awayValue) ?? 0) * 100 : ratio(x.awayValue);
    const text = (v: unknown, num: number) => (pct ? `${Math.round(num)} %` : typeof v === "string" ? v : String(num));
    teamStats.push({ key, label: TEAM_STAT_LABELS[key]!, home: hv, away: av, homeText: text(x.homeValue, hv), awayText: text(x.awayValue, av) });
  }
  const info = o(root.gameInfo);
  const names = (list: unknown) => a(list).map((p) => fullName(p)).filter(Boolean);
  const team = (k: string) => o(info[k]);
  const ts = o(root.teamSeasonStats);
  const season = (t: unknown): NhlTeamSeason => {
    const x = o(t);
    return {
      ppPct: n(x.ppPctg),
      pkPct: n(x.pkPctg),
      foPct: n(x.faceoffWinningPctg),
      gfPerGame: n(x.goalsForPerGamePlayed),
      gaPerGame: n(x.goalsAgainstPerGamePlayed),
      ranks: { pp: n(x.ppPctgRank), pk: n(x.pkPctgRank), fo: n(x.faceoffWinningPctgRank), gf: n(x.goalsForPerGamePlayedRank), ga: n(x.goalsAgainstPerGamePlayedRank) },
    };
  };
  const wins = o(root.seasonSeriesWins);
  return {
    teamStats,
    referees: names(info.referees),
    linesmen: names(info.linesmen),
    coaches: { home: loc(team("homeTeam").headCoach) || null, away: loc(team("awayTeam").headCoach) || null },
    scratches: { home: names(team("homeTeam").scratches), away: names(team("awayTeam").scratches) },
    seasonSeries: a(root.seasonSeries).map((g) => {
      const x = o(g);
      return {
        id: n(x.id) ?? 0,
        date: s(x.startTimeUTC) || s(x.gameDate),
        state: s(x.gameState),
        homeAbbrev: s(o(x.homeTeam).abbrev),
        awayAbbrev: s(o(x.awayTeam).abbrev),
        homeScore: n(o(x.homeTeam).score),
        awayScore: n(o(x.awayTeam).score),
      };
    }),
    seriesWins: root.seasonSeriesWins ? { home: n(wins.homeTeamWins) ?? 0, away: n(wins.awayTeamWins) ?? 0 } : null,
    teamSeason: ts.homeTeam ? { home: season(ts.homeTeam), away: season(ts.awayTeam) } : null,
  };
}

const PENALTY_CS: Record<string, string> = {
  holding: "držení",
  hooking: "hákování",
  tripping: "podražení",
  slashing: "sekání",
  roughing: "hrubost",
  interference: "bránění ve hře",
  "high-sticking": "vysoká hůl",
  "high-sticking-double-minor": "vysoká hůl (2+2)",
  "cross-checking": "krosček",
  "delay-of-game": "zdržování hry",
  "delaying-game-puck-over-glass": "zdržování hry (puk mimo hřiště)",
  "too-many-men-on-the-ice": "too many men",
  fighting: "bitka",
  boarding: "napadení u mantinelu",
  "unsportsmanlike-conduct": "nesportovní chování",
  "holding-the-stick": "držení hole",
  "goalie-interference": "bránění brankáři",
  "interference-goalkeeper": "bránění brankáři",
  "goaltender-interference": "bránění brankáři",
  embellishment: "filmování",
  elbowing: "loket",
  kneeling: "koleno",
  charging: "napadení",
  "misconduct": "osobní trest",
  "game-misconduct": "osobní trest do konce utkání",
  "instigator": "vyprovokování bitky",
  "illegal-check-to-head": "hit na hlavu",
  "closing-hand-on-puck": "zavření puku rukou",
  "abuse-of-officials": "urážka rozhodčích",
};

export interface NhlPenalty {
  period: number;
  time: string;
  team: string;
  player: string | null;
  drawnBy: string | null;
  minutes: number;
  reason: string;
}

export interface NhlStar {
  star: number;
  playerId: number;
  name: string;
  team: string;
  headshot: string;
  position: string;
  goals: number | null;
  assists: number | null;
  points: number | null;
  /** Goalies: save percentage. */
  savePct: number | null;
}

export interface NhlLeaderPair {
  category: string;
  label: string;
  home: { id: number; name: string; headshot: string; value: number } | null;
  away: { id: number; name: string; headshot: string; value: number } | null;
}

export interface NhlGoalieCard {
  id: number;
  name: string;
  headshot: string;
  gp: number | null;
  record: string;
  gaa: number | null;
  savePct: number | null;
  shutouts: number | null;
}

export interface NhlLandingExtras {
  venue: string | null;
  tv: string[];
  threeStars: NhlStar[];
  penalties: NhlPenalty[];
  records: { home: string | null; away: string | null };
  matchup: {
    /** Season the comparison is drawn from, e.g. 20252026. */
    season: number | null;
    leaders: NhlLeaderPair[];
    goalies: { home: NhlGoalieCard[]; away: NhlGoalieCard[] };
    goalieTotals: { home: { record: string; gaa: number | null; savePct: number | null } | null; away: { record: string; gaa: number | null; savePct: number | null } | null };
  } | null;
}

const LEADER_LABEL: Record<string, string> = { points: "Body", goals: "Góly", assists: "Asistence", plusMinus: "+/−", gaa: "Průměr", savePctg: "Úspěšnost" };

export function parseNhlLandingExtras(json: unknown): NhlLandingExtras {
  const root = o(json);
  const summary = o(root.summary);
  const penalties: NhlPenalty[] = [];
  for (const per of a(summary.penalties)) {
    const p = o(per);
    const period = n(o(p.periodDescriptor).number) ?? 0;
    for (const raw of a(p.penalties)) {
      const x = o(raw);
      const key = s(x.descKey);
      penalties.push({
        period,
        time: s(x.timeInPeriod),
        team: loc(x.teamAbbrev) || s(x.teamAbbrev),
        player: fullName(x.committedByPlayer) || null,
        drawnBy: fullName(x.drawnBy) || null,
        minutes: n(x.duration) ?? 0,
        reason: PENALTY_CS[key] ?? key.replace(/-/g, " "),
      });
    }
  }
  const matchup = o(root.matchup);
  const lead = a(o(matchup.skaterComparison).leaders).map((raw) => {
    const x = o(raw);
    const pl = (v: unknown) => {
      const p = o(v);
      const id = n(p.playerId);
      return id ? { id, name: fullName(p), headshot: s(p.headshot), value: n(p.value) ?? 0 } : null;
    };
    const cat = s(x.category);
    return { category: cat, label: LEADER_LABEL[cat] ?? cat, home: pl(x.homeLeader), away: pl(x.awayLeader) };
  });
  const gc = o(matchup.goalieComparison);
  const goalies = (k: string) =>
    a(o(gc[k]).leaders).map((raw) => {
      const x = o(raw);
      return {
        id: n(x.playerId) ?? 0,
        name: fullName(x),
        headshot: s(x.headshot),
        gp: n(x.gamesPlayed),
        record: s(x.record),
        gaa: n(x.gaa),
        savePct: n(x.savePctg),
        shutouts: n(x.shutouts),
      };
    });
  const totals = (k: string) => {
    const t = o(o(gc[k]).teamTotals);
    return t.record ? { record: s(t.record), gaa: n(t.gaa), savePct: n(t.savePctg) } : null;
  };
  return {
    venue: loc(root.venue) || null,
    tv: a(root.tvBroadcasts).map((t) => s(o(t).network)).filter(Boolean),
    threeStars: a(summary.threeStars).map((raw) => {
      const x = o(raw);
      return {
        star: n(x.star) ?? 0,
        playerId: n(x.playerId) ?? 0,
        name: loc(x.name),
        team: s(x.teamAbbrev),
        headshot: s(x.headshot),
        position: s(x.position),
        goals: n(x.goals),
        assists: n(x.assists),
        points: n(x.points),
        savePct: n(x.savePctg),
      };
    }),
    penalties,
    records: { home: s(o(root.homeTeam).record) || null, away: s(o(root.awayTeam).record) || null },
    matchup: root.matchup
      ? { season: n(o(matchup.skaterComparison).contextSeason), leaders: lead, goalies: { home: goalies("homeTeam"), away: goalies("awayTeam") }, goalieTotals: { home: totals("homeTeam"), away: totals("awayTeam") } }
      : null,
  };
}

// ---------- per-period team stats from play-by-play ----------

export type NhlPeriodKey = "1" | "2" | "3" | "OT" | "total";

export interface NhlStatRow {
  key: string;
  label: string;
  home: number;
  away: number;
  homeText?: string;
  awayText?: string;
  lowerIsBetter?: boolean;
  decimals?: number;
}

interface Counts {
  goals: number;
  sog: number;
  missed: number;
  blockedBy: number; // own attempts blocked by the opponent
  blocks: number; // opponent attempts this team blocked
  hits: number;
  giveaways: number;
  takeaways: number;
  foWon: number;
  foOz: number;
  foOzWon: number;
  foDz: number;
  foDzWon: number;
  penalties: number;
  pim: number;
  cf5: number; // shot attempts at 5-on-5
}

const zero = (): Counts => ({ goals: 0, sog: 0, missed: 0, blockedBy: 0, blocks: 0, hits: 0, giveaways: 0, takeaways: 0, foWon: 0, foOz: 0, foOzWon: 0, foDz: 0, foDzWon: 0, penalties: 0, pim: 0, cf5: 0 });

/**
 * Team stats per period computed from every play: shot attempts (Corsi), misses, blocks, hits,
 * giveaways/takeaways, faceoffs overall and by zone, penalties, 5-on-5 attempt share.
 */
export function nhlPeriodStats(json: unknown): { periods: NhlPeriodKey[]; rows: Partial<Record<NhlPeriodKey, NhlStatRow[]>> } {
  const root = o(json);
  const homeId = n(o(root.homeTeam).id);
  const awayId = n(o(root.awayTeam).id);
  const teamOf = new Map<number, number>();
  for (const r of a(root.rosterSpots)) {
    const x = o(r);
    const pid = n(x.playerId);
    const tid = n(x.teamId);
    if (pid && tid) teamOf.set(pid, tid);
  }
  const acc = new Map<NhlPeriodKey, { home: Counts; away: Counts }>();
  const get = (k: NhlPeriodKey) => {
    let v = acc.get(k);
    if (!v) acc.set(k, (v = { home: zero(), away: zero() }));
    return v;
  };
  type Side = "home" | "away";
  const sideOf = (teamId: number | null): Side | null => (teamId === homeId ? "home" : teamId === awayId ? "away" : null);
  const other = (x: Side): Side => (x === "home" ? "away" : "home");

  for (const raw of a(root.plays)) {
    const p = o(raw);
    const type = s(p.typeDescKey);
    const d = o(p.details);
    const pd = o(p.periodDescriptor);
    const num = n(pd.number) ?? 0;
    if (s(pd.periodType) === "SO" || num >= 5) continue;
    const key: NhlPeriodKey = num >= 4 ? "OT" : (String(num) as NhlPeriodKey);
    const code = s(p.situationCode);
    const even5 = code === "1551";
    let side = sideOf(n(d.eventOwnerTeamId));
    // Blocked shots: attribute to the shooter's team via the roster (the owner field has changed meaning over seasons).
    if (type === "blocked-shot") {
      const shooter = n(d.shootingPlayerId);
      const t = shooter ? teamOf.get(shooter) : undefined;
      if (t) side = sideOf(t);
    }
    if (!side) continue;
    for (const k of [key, "total"] as NhlPeriodKey[]) {
      const c = get(k);
      const me = c[side];
      const opp = c[other(side)];
      switch (type) {
        case "goal":
          me.goals++;
          me.sog++;
          if (even5) me.cf5++;
          break;
        case "shot-on-goal":
          me.sog++;
          if (even5) me.cf5++;
          break;
        case "missed-shot":
          me.missed++;
          if (even5) me.cf5++;
          break;
        case "blocked-shot":
          me.blockedBy++;
          opp.blocks++;
          if (even5) me.cf5++;
          break;
        case "hit":
          me.hits++;
          break;
        case "giveaway":
          me.giveaways++;
          break;
        case "takeaway":
          me.takeaways++;
          break;
        case "faceoff": {
          me.foWon++;
          // Zone code is from the winning team's point of view.
          const z = s(d.zoneCode);
          if (z === "O") (me.foOz++, me.foOzWon++, opp.foDz++);
          else if (z === "D") (me.foDz++, me.foDzWon++, opp.foOz++);
          break;
        }
        case "penalty":
          me.penalties++;
          me.pim += n(d.duration) ?? 0;
          break;
      }
    }
  }

  const rows: Partial<Record<NhlPeriodKey, NhlStatRow[]>> = {};
  for (const [k, { home: h, away: w }] of acc) {
    const att = (c: Counts) => c.sog + c.missed + c.blockedBy;
    const fo = h.foWon + w.foWon;
    const pct = (x: number, t: number) => (t ? `${Math.round((x / t) * 100)} %` : "–");
    const list: NhlStatRow[] = [
      { key: "sog", label: "Střely na branku", home: h.sog, away: w.sog },
      { key: "attempts", label: "Pokusy o střelu (Corsi)", home: att(h), away: att(w) },
      { key: "missed", label: "Střely mimo branku", home: h.missed, away: w.missed },
      { key: "blockedBy", label: "Střely zblokované soupeřem", home: h.blockedBy, away: w.blockedBy, lowerIsBetter: true },
      { key: "blocks", label: "Zblokované střely soupeře", home: h.blocks, away: w.blocks },
      { key: "cf5", label: "Podíl pokusů při hře 5 na 5", home: h.cf5, away: w.cf5, homeText: pct(h.cf5, h.cf5 + w.cf5), awayText: pct(w.cf5, h.cf5 + w.cf5) },
      { key: "fo", label: "Vyhraná buly", home: h.foWon, away: w.foWon, homeText: `${h.foWon} (${pct(h.foWon, fo)})`, awayText: `${w.foWon} (${pct(w.foWon, fo)})` },
      { key: "foOz", label: "Buly v útočném pásmu", home: h.foOzWon, away: w.foOzWon, homeText: `${h.foOzWon}/${h.foOz}`, awayText: `${w.foOzWon}/${w.foOz}` },
      { key: "foDz", label: "Buly v obranném pásmu", home: h.foDzWon, away: w.foDzWon, homeText: `${h.foDzWon}/${h.foDz}`, awayText: `${w.foDzWon}/${w.foDz}` },
      { key: "hits", label: "Hity", home: h.hits, away: w.hits },
      { key: "takeaways", label: "Zisky puku", home: h.takeaways, away: w.takeaways },
      { key: "giveaways", label: "Ztráty puku", home: h.giveaways, away: w.giveaways, lowerIsBetter: true },
      { key: "penalties", label: "Vyloučení", home: h.penalties, away: w.penalties, lowerIsBetter: true },
      { key: "pim", label: "Trestné minuty", home: h.pim, away: w.pim, lowerIsBetter: true },
    ];
    rows[k] = list;
  }
  const periods = (["total", "1", "2", "3", "OT"] as NhlPeriodKey[]).filter((k) => rows[k]);
  return { periods, rows };
}
