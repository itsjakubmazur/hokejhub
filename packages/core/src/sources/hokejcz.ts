import { parse, type HTMLElement } from "node-html-parser";

export const HOKEJCZ_ATTRIBUTION = "Data: hokej.cz (ČSLH)";

export const hokejczPaths = {
  match: (id: number) => `zapas/${id}`,
  table: (season: number, competition = 4171) =>
    `tipsport-extraliga/table?table-filter-season=${season}&table-filter-competition=${competition}`,
  schedule: (season: number, competition: number, round?: number) =>
    `tipsport-extraliga/zapasy?matchList-filter-season=${season}&matchList-filter-competition=${competition}` +
    (round ? `&matchList-view-round-round=${round}` : ""),
  playerStats: (season: number, competition = 4171) =>
    `tipsport-extraliga/player-stats/detailni?stats-filter-season=${season}&stats-filter-competition=${competition}`,
};

export interface HokejczPlayerRef {
  name: string;
  /** hokej.cz player id from `/hrac/{slug}/{id}`. */
  id: number | null;
}

export interface HokejczTeam {
  name: string;
  shortName: string;
  abbrev: string;
  clubId: number | null;
  logoUrl: string | null;
}

export interface HokejczGoal {
  period: string;
  time: string;
  team: string;
  scorer: HokejczPlayerRef;
  /** Scorer's season goal count shown in brackets. */
  scorerSeasonGoals: number | null;
  assists: HokejczPlayerRef[];
  /** e.g. `5/5`, `5/4`, `4/5`, `EN`. */
  situation: string;
  /** Players on ice for the scoring team (+) and the conceding team (−). */
  onIcePlus: HokejczPlayerRef[];
  onIceMinus: HokejczPlayerRef[];
}

export interface HokejczPenalty {
  period: string;
  time: string;
  team: string;
  player: HokejczPlayerRef;
  minutes: number | null;
  reason: string;
}

export interface HokejczSkaterLine {
  number: number | null;
  position: string;
  player: HokejczPlayerRef;
  toiSeconds: number | null;
  ppToiSeconds: number | null;
  shToiSeconds: number | null;
  goals: number;
  assists: number;
  points: number;
  pim: number;
  plusMinus: number;
  hits: number;
  shots: number;
  blocks: number;
  faceoffsWon: number | null;
  faceoffsTaken: number | null;
  radegastIndex: number | null;
}

export interface HokejczGoalieLine {
  number: number | null;
  player: HokejczPlayerRef;
  toiSeconds: number | null;
  saves: number;
  goalsAgainst: number;
  savePct: number | null;
  assists: number;
  pim: number;
}

export interface HokejczMatch {
  id: number;
  competition: string | null;
  /** Local (Prague) start as shown, `D.M.YYYY HH:MM`. */
  startLocal: string | null;
  round: string | null;
  home: HokejczTeam;
  away: HokejczTeam;
  homeScore: number | null;
  awayScore: number | null;
  statusLabel: string | null;
  /** Regulation periods plus overtime (if played); a shootout is not a period. */
  periods: [number, number][];
  decidedIn: "REG" | "OT" | "SO" | null;
  /** Playoff series state after this game, e.g. `4:2`. */
  series: string | null;
  attendance: number | null;
  venue: string | null;
  capacity: number | null;
  referees: string[];
  linesmen: string[];
  /** Team stats as `[home, away]`, keyed by the Czech label (e.g. "Střely na branku"). */
  teamStats: Record<string, [number, number]>;
  shotsByPeriod: [number, number][];
  goals: HokejczGoal[];
  penalties: HokejczPenalty[];
  skaters: { home: HokejczSkaterLine[]; away: HokejczSkaterLine[] };
  goalies: { home: HokejczGoalieLine[]; away: HokejczGoalieLine[] };
}

const clean = (s: string | undefined | null) => (s ?? "").replace(/\s+/g, " ").trim();

function int(s: string | undefined): number | null {
  const n = Number.parseInt(clean(s).replace(/\s/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function num(s: string | undefined): number | null {
  const n = Number.parseFloat(clean(s).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function mmss(s: string | undefined): number | null {
  const m = /^(\d+):(\d{2})$/.exec(clean(s));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function pair(s: string): [number, number] | null {
  const m = /^(-?\d+)\s*:\s*(-?\d+)$/.exec(clean(s));
  return m ? [Number(m[1]), Number(m[2])] : null;
}

function idFromHref(href: string | undefined, prefix: string): number | null {
  const m = new RegExp(`/${prefix}/[^/]+/(\\d+)`).exec(href ?? "");
  return m ? Number(m[1]) : null;
}

function playerRef(a: HTMLElement): HokejczPlayerRef {
  const label = a.childNodes
    .filter((n) => !(n instanceof Object && "tagName" in n && (n as HTMLElement).tagName === "SPAN"))
    .map((n) => n.text)
    .join("");
  return { name: clean(label), id: idFromHref(a.getAttribute("href"), "hrac") };
}

function bracketCount(a: HTMLElement): number | null {
  const m = /\((\d+)\)/.exec(a.querySelector("span")?.text ?? "");
  return m ? Number(m[1]) : null;
}

function cells(tr: HTMLElement): HTMLElement[] {
  return tr.querySelectorAll("td");
}

function headers(table: HTMLElement): string[] {
  return table.querySelectorAll("th").map((th) => clean(th.text));
}

function parseTeam(el: HTMLElement | null): HokejczTeam {
  const a = el?.querySelector("a");
  const logo = el?.querySelector("img")?.getAttribute("src") ?? null;
  return {
    name: clean(el?.querySelector("h2.long")?.text),
    shortName: clean(el?.querySelector("h2.medium")?.text),
    abbrev: clean(el?.querySelector("h2.short")?.text),
    clubId: idFromHref(a?.getAttribute("href"), "klub"),
    logoUrl: logo ? new URL(logo, "https://www.hokej.cz/").toString() : null,
  };
}

function parseSkaters(table: HTMLElement): HokejczSkaterLine[] {
  // Columns: Č P Hráč TOI PPTOI SHTOI G A B T +/- H S B BULY RI
  return table
    .querySelectorAll("tr")
    .map(cells)
    .filter((c) => c.length >= 16)
    .map((c) => {
      const fo = /\((\d+)\/(\d+)\)/.exec(clean(c[14]?.text));
      const a = c[2]!.querySelector("a");
      return {
        number: int(c[0]?.text),
        position: clean(c[1]?.text),
        player: a ? playerRef(a) : { name: clean(c[2]?.text), id: null },
        toiSeconds: mmss(c[3]?.text),
        ppToiSeconds: mmss(c[4]?.text),
        shToiSeconds: mmss(c[5]?.text),
        goals: int(c[6]?.text) ?? 0,
        assists: int(c[7]?.text) ?? 0,
        points: int(c[8]?.text) ?? 0,
        pim: int(c[9]?.text) ?? 0,
        plusMinus: int(c[10]?.text) ?? 0,
        hits: int(c[11]?.text) ?? 0,
        shots: int(c[12]?.text) ?? 0,
        blocks: int(c[13]?.text) ?? 0,
        faceoffsWon: fo ? Number(fo[1]) : null,
        faceoffsTaken: fo ? Number(fo[2]) : null,
        radegastIndex: int(c[15]?.text),
      };
    });
}

function parseGoalies(table: HTMLElement): HokejczGoalieLine[] {
  // Columns: Č P Hráč ČAS Z G %Z A T
  return table
    .querySelectorAll("tr")
    .map(cells)
    .filter((c) => c.length >= 9)
    .map((c) => {
      const a = c[2]!.querySelector("a");
      return {
        number: int(c[0]?.text),
        player: a ? playerRef(a) : { name: clean(c[2]?.text), id: null },
        toiSeconds: mmss(c[3]?.text),
        saves: int(c[4]?.text) ?? 0,
        goalsAgainst: int(c[5]?.text) ?? 0,
        savePct: num(c[6]?.text),
        assists: int(c[7]?.text) ?? 0,
        pim: int(c[8]?.text) ?? 0,
      };
    });
}

/** Nearest preceding `<h3>` (period heading) of an element in document order. */
function periodHeadingFor(root: HTMLElement, table: HTMLElement): string {
  let current = "";
  for (const el of root.querySelectorAll("h3, table")) {
    if (el === table) return current;
    if (el.tagName === "H3") current = clean(el.text);
  }
  return current;
}

function parseGoalTable(table: HTMLElement, period: string): HokejczGoal[] {
  const goals: HokejczGoal[] = [];
  for (const tr of table.querySelectorAll("tr")) {
    const c = cells(tr);
    if (tr.classList.contains("row-plus-minus")) {
      const last = goals.at(-1);
      if (!last) continue;
      const refs = tr.querySelectorAll("a").map(playerRef);
      if (tr.querySelector(".fa-plus")) last.onIcePlus = refs;
      else last.onIceMinus = refs;
      continue;
    }
    if (c.length < 5) continue;
    const scorerA = c[2]!.querySelector("a");
    goals.push({
      period,
      time: clean(c[0]?.text),
      team: clean(c[1]?.text),
      scorer: scorerA ? playerRef(scorerA) : { name: clean(c[2]?.text), id: null },
      scorerSeasonGoals: scorerA ? bracketCount(scorerA) : null,
      assists: c[3]!.querySelectorAll("a").map(playerRef),
      situation: clean(c[4]?.text),
      onIcePlus: [],
      onIceMinus: [],
    });
  }
  return goals;
}

function parsePenaltyTable(table: HTMLElement, period: string): HokejczPenalty[] {
  return table
    .querySelectorAll("tr")
    .map(cells)
    .filter((c) => c.length >= 4)
    .map((c) => {
      const a = c[2]!.querySelector("a");
      const text = clean(c[3]?.text);
      const m = /^(\d+)\s*min\.?\s*(.*)$/.exec(text);
      return {
        period,
        time: clean(c[0]?.text),
        team: clean(c[1]?.text),
        player: a ? playerRef(a) : { name: clean(c[2]?.text), id: null },
        minutes: m ? Number(m[1]) : null,
        reason: m ? m[2]! : text,
      };
    });
}

/**
 * Parses hokej.cz period strings: `1:0, 2:1, 0:0` (regulation), `… - 1:0` (overtime) and
 * `… - 0:0 - 1:0` (overtime then shootout).
 */
export function parsePeriodString(text: string): { periods: [number, number][]; decidedIn: "REG" | "OT" | "SO" | null } {
  const segments = clean(text.replace(/[()]/g, "")).split(/\s+-\s+/);
  const regulation = (segments[0] ?? "")
    .split(",")
    .map(pair)
    .filter((p): p is [number, number] => p !== null);
  if (regulation.length === 0) return { periods: [], decidedIn: null };
  const ot = segments[1] ? pair(segments[1]) : null;
  const so = segments[2] ? pair(segments[2]) : null;
  const periods = ot ? [...regulation, ot] : regulation;
  return { periods, decidedIn: so ? "SO" : ot ? "OT" : "REG" };
}

/** Parses a hokej.cz match page (`/zapas/{id}/`). Older matches may lack some sections. */
export function parseHokejczMatch(html: string, id: number): HokejczMatch {
  const root = parse(html);
  const page = root.querySelector(".page.match") ?? root;

  const headingItems = page.querySelectorAll(".heading li").map((li) => clean(li.text));
  const scoreEl = page.querySelector(".match-score .score");
  const scoreMeta = scoreEl?.querySelectorAll("div span").map((s) => clean(s.text)) ?? [];

  const { periods, decidedIn } = parsePeriodString(scoreMeta[1] ?? "");

  const teamStats: Record<string, [number, number]> = {};
  const referees: string[] = [];
  const linesmen: string[] = [];
  let shotsByPeriod: [number, number][] = [];

  const goals: HokejczGoal[] = [];
  const penalties: HokejczPenalty[] = [];
  const skaters = { home: [] as HokejczSkaterLine[], away: [] as HokejczSkaterLine[] };
  const goalies = { home: [] as HokejczGoalieLine[], away: [] as HokejczGoalieLine[] };

  for (const table of root.querySelectorAll("table")) {
    const head = headers(table);
    const side = table.closest(".col-soupisky-home") ? "home" : table.closest(".col-soupisky-visitor") ? "away" : null;
    if (head.includes("TOI") && side) {
      skaters[side].push(...parseSkaters(table));
    } else if (head.includes("%Z") && side) {
      goalies[side].push(...parseGoalies(table));
    } else if (head[0] === "čas" && head.includes("branky")) {
      goals.push(...parseGoalTable(table, periodHeadingFor(root, table)));
    } else if (head[0] === "čas" && head.includes("vyloučení")) {
      penalties.push(...parsePenaltyTable(table, periodHeadingFor(root, table)));
    } else if (table.classList.contains("table-first-bold")) {
      for (const tr of table.querySelectorAll("tr")) {
        const c = cells(tr);
        if (c.length < 2) continue;
        const label = clean(c[0]!.text).replace(/:$/, "");
        const value = clean(c[1]!.text);
        if (label === "Hlavní rozhodčí") referees.push(...c[1]!.querySelectorAll("a, span").map((x) => clean(x.text)).filter(Boolean));
        else if (label === "Čároví rozhodčí") linesmen.push(...c[1]!.querySelectorAll("a, span").map((x) => clean(x.text)).filter(Boolean));
        else if (label === "Střely po třetinách")
          shotsByPeriod = value.split(",").map(pair).filter((p): p is [number, number] => p !== null);
        else {
          const p = pair(value);
          if (p) teamStats[label] = p;
        }
      }
    }
  }

  return {
    id,
    competition: headingItems[0] ?? null,
    startLocal: headingItems[1] ?? null,
    round: headingItems[2] ?? null,
    home: parseTeam(page.querySelector(".match-score .team-home")),
    away: parseTeam(page.querySelector(".match-score .team-visiting")),
    homeScore: int(scoreEl?.querySelector(".home")?.text),
    awayScore: int(scoreEl?.querySelector(".visiting")?.text),
    statusLabel: scoreMeta[0] ?? null,
    periods,
    decidedIn: /s\.\s*n\./.test(scoreMeta[0] ?? "") ? "SO" : decidedIn,
    series: headingItems.find((h) => h.startsWith("stav série"))?.replace("stav série", "").trim() ?? null,
    attendance: int(root.querySelector(".box-count-visitors")?.text),
    venue: clean(root.querySelector(".box-heading-stadium")?.text) || null,
    capacity: int(root.querySelector(".box-count-stadium")?.text),
    referees,
    linesmen,
    teamStats,
    shotsByPeriod,
    goals,
    penalties,
    skaters,
    goalies,
  };
}

// ---------- schedule (/zapasy) ----------

export interface HokejczCompetitionOption {
  id: number;
  name: string;
  phase: "regular" | "playoff" | "relegation" | "other";
}

export interface HokejczScheduleMatch {
  id: number;
  home: { name: string; shortName: string; abbrev: string };
  away: { name: string; shortName: string; abbrev: string };
  homeScore: number | null;
  awayScore: number | null;
  periods: [number, number][];
  decidedIn: "REG" | "OT" | "SO" | null;
  /** `YYYY-MM-DD`, year inferred from the season (July+ = start year). */
  date: string | null;
  /** Nearest group heading, e.g. "Čtvrtfinále" (playoff pages). */
  stage: string | null;
  /** Series heading, e.g. "Série A - B: 3:2". */
  seriesLabel: string | null;
}

export interface HokejczSchedulePage {
  seasons: number[];
  competitions: HokejczCompetitionOption[];
  selectedCompetition: number | null;
  /** Round numbers available in the round dropdown (regular season). */
  rounds: number[];
  matches: HokejczScheduleMatch[];
}

/**
 * Pre-season cups and friendlies share the extraliga's competition list on hokej.cz (2020's
 * "Generali Česká Cup – sk. A … play off"), but are not league games and must not count.
 */
export function isLeagueCompetition(name: string): boolean {
  return !/\bcup\b|pohár|přípra|turnaj/i.test(name);
}

export function competitionPhase(name: string): HokejczCompetitionOption["phase"] {
  const n = name.toLowerCase();
  if (n.includes("play") || n.includes("předkolo")) return "playoff";
  if (n.includes("baráž") || n.includes("sestup") || n.includes("kvalifikace")) return "relegation";
  if (n.includes("extraliga") || n.includes("liga")) return "regular";
  return "other";
}

function selectOptions(root: HTMLElement, name: string) {
  const sel = root.querySelector(`select[name="${name}"]`);
  return (sel?.querySelectorAll("option") ?? []).map((o) => ({
    value: o.getAttribute("value") ?? "",
    label: clean(o.text),
    selected: o.hasAttribute("selected"),
  }));
}

function inferDate(label: string, season: number): string | null {
  const m = /(\d{1,2})\.\s*(\d{1,2})\./.exec(label);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = month >= 7 ? season : season + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseHokejczSchedule(html: string, season: number): HokejczSchedulePage {
  const root = parse(html);
  const seasons = selectOptions(root, "season")
    .map((o) => Number(o.value))
    .filter(Number.isFinite);
  const compOpts = selectOptions(root, "competition").filter((o) => o.value && o.value !== "0");
  const competitions = compOpts.map((o) => ({ id: Number(o.value), name: o.label, phase: competitionPhase(o.label) }));
  const selected = compOpts.find((o) => o.selected);

  // The round <option>s are not closed in the markup, so read them from the raw HTML.
  const rounds = new Set<number>();
  for (const m of html.matchAll(/value="[^"]*matchList-view-round-round=(\d+)/g)) rounds.add(Number(m[1]));

  const matches: HokejczScheduleMatch[] = [];
  const seen = new Set<number>();
  let stage: string | null = null;
  let seriesLabel: string | null = null;
  for (const el of root.querySelectorAll("h2, h3, table.preview tr")) {
    if (el.tagName === "H2") {
      stage = clean(el.text);
      seriesLabel = null;
      continue;
    }
    if (el.tagName === "H3") {
      const t = clean(el.text);
      if (t.startsWith("Série")) seriesLabel = t;
      else stage = t;
      continue;
    }
    const href = el.getAttribute("data-href") ?? el.querySelector("a")?.getAttribute("href") ?? "";
    const idm = /\/zapas\/(\d+)/.exec(href);
    if (!idm) continue;
    const id = Number(idm[1]);
    if (seen.has(id)) continue;
    seen.add(id);
    const names = el.querySelectorAll(".preview__name");
    const team = (td: HTMLElement | undefined) => ({
      name: clean(td?.querySelector(".preview__name--long")?.text),
      shortName: clean(td?.querySelector(".preview__name--medium")?.text),
      abbrev: clean(td?.querySelector(".preview__name--short")?.text),
    });
    const scores = el.querySelectorAll(".preview__score");
    const periodCell = el.querySelector(".preview__period");
    const spans = periodCell?.querySelectorAll("span") ?? [];
    const dateLabel = clean(periodCell?.querySelector(".match-start-time")?.text);
    const periodText = spans.map((x) => clean(x.text)).find((t) => t.startsWith("(")) ?? "";
    const parsed = parsePeriodString(periodText);
    const dot = clean(el.querySelector(".preview__dot")?.text);
    matches.push({
      id,
      home: team(names[0]),
      away: team(names[1]),
      homeScore: int(scores[0]?.text),
      awayScore: int(scores[1]?.text),
      periods: parsed.periods,
      decidedIn: dot === "SN" ? "SO" : dot === "P" ? "OT" : parsed.decidedIn,
      date: inferDate(dateLabel, season),
      stage: stage && !/^Tabulka|bodování|index|turnaje|zápasy|Reprezentace/i.test(stage) ? stage : null,
      seriesLabel,
    });
  }

  return {
    seasons,
    competitions,
    selectedCompetition: selected ? Number(selected.value) : null,
    rounds: [...rounds].sort((a, b) => a - b),
    matches,
  };
}

// ---------- standings (/table) ----------

export interface HokejczStandingRow {
  rank: number | null;
  team: string;
  /** Raw columns keyed by header (Z, V, VP, R, PP, P, Skóre, B, …). */
  values: Record<string, string>;
  gp: number | null;
  w: number | null;
  otw: number | null;
  ties: number | null;
  otl: number | null;
  l: number | null;
  gf: number | null;
  ga: number | null;
  pts: number | null;
}

export interface HokejczStandings {
  overall: HokejczStandingRow[];
  home: HokejczStandingRow[];
  away: HokejczStandingRow[];
}

export function parseHokejczStandings(html: string): HokejczStandings {
  const root = parse(html);
  const out: HokejczStandings = { overall: [], home: [], away: [] };
  const tables = root.querySelectorAll("table.table-soupiska");
  for (const table of tables) {
    // The heading right before the table says which split it is.
    let heading = "";
    for (const el of root.querySelectorAll("h2, table.table-soupiska")) {
      if (el === table) break;
      if (el.tagName === "H2") heading = clean(el.text);
    }
    const key = /DOMA$/i.test(heading) ? "home" : /VENKU$/i.test(heading) ? "away" : "overall";
    if (out[key].length > 0) continue;
    const head = headers(table);
    for (const tr of table.querySelectorAll("tr")) {
      const c = cells(tr);
      if (c.length < head.length - 1 || c.length < 4) continue;
      const values: Record<string, string> = {};
      head.forEach((h, i) => (values[h] = clean(c[i]?.text)));
      const score = pair(values["Skóre"] ?? "");
      const n = (k: string) => (k in values ? int(values[k]) : null);
      out[key].push({
        rank: int(values["#"]),
        team: values["Tým"] ?? "",
        values,
        gp: n("Z"),
        w: n("V"),
        otw: n("VP"),
        ties: n("R"),
        otl: n("PP"),
        l: n("P"),
        gf: score?.[0] ?? null,
        ga: score?.[1] ?? null,
        pts: n("B"),
      });
    }
  }
  return out;
}

/**
 * Every standings table on a hokej.cz table page with the heading above it — leagues split into
 * groups ("2. liga – Západ", "2. liga – Východ") get one entry each. Home/away splits are left out.
 */
export function parseHokejczTableGroups(html: string): { title: string; rows: HokejczStandingRow[] }[] {
  const root = parse(html);
  const out: { title: string; rows: HokejczStandingRow[] }[] = [];
  let heading = "";
  for (const el of root.querySelectorAll("h2, table.table-soupiska")) {
    if (el.tagName === "H2") {
      heading = clean(el.text);
      continue;
    }
    if (/(DOMA|VENKU)$/i.test(heading)) continue;
    const head = headers(el);
    const rows: HokejczStandingRow[] = [];
    for (const tr of el.querySelectorAll("tr")) {
      const c = cells(tr);
      if (c.length < head.length - 1 || c.length < 4) continue;
      const values: Record<string, string> = {};
      head.forEach((h, i) => (values[h] = clean(c[i]?.text)));
      const score = pair(values["Skóre"] ?? "");
      const n = (k: string) => (k in values ? int(values[k]) : null);
      rows.push({
        rank: int(values["#"]),
        team: values["Tým"] ?? "",
        values,
        gp: n("Z"),
        w: n("V"),
        otw: n("VP"),
        ties: n("R"),
        otl: n("PP"),
        l: n("P"),
        gf: score?.[0] ?? null,
        ga: score?.[1] ?? null,
        pts: n("B"),
      });
    }
    if (rows.length) out.push({ title: heading, rows });
  }
  return out;
}

// ---------- player profile (/hrac/{slug}/{id}) ----------

export interface HokejczPlayerProfile {
  id: number;
  name: string;
  /** Absolute URL, null when hokej.cz only has a placeholder. */
  photoUrl: string | null;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  position: "G" | "D" | "F" | null;
  shoots: "L" | "R" | null;
  clubId: number | null;
  clubName: string | null;
}

export function parseHokejczPlayer(html: string, id: number): HokejczPlayerProfile {
  const root = parse(html);
  const info = root.querySelector(".person-info") ?? root;
  const img = info.querySelector(".person-info__image img")?.getAttribute("src") ?? null;
  const data: Record<string, string> = {};
  for (const d of info.querySelectorAll(".person-info__data")) {
    data[clean(d.querySelector("h2")?.text).toLowerCase()] = clean(d.querySelector("span")?.text);
  }
  const birth = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(data["narozen"] ?? "");
  const post = (data["post"] ?? "").toLowerCase();
  const stick = (data["hůl"] ?? "").toLowerCase();
  const club = info.querySelector(".person-info-club a");
  return {
    id,
    name: clean(info.querySelector("h1")?.text),
    photoUrl: img && !/placeholder/i.test(img) ? new URL(img, "https://www.hokej.cz/").toString() : null,
    birthDate: birth ? `${birth[3]}-${birth[2]!.padStart(2, "0")}-${birth[1]!.padStart(2, "0")}` : null,
    heightCm: int(data["výška"]),
    weightKg: int(data["váha"]),
    position: post.startsWith("brank") ? "G" : post.startsWith("obr") ? "D" : post.startsWith("út") ? "F" : null,
    shoots: stick.startsWith("lev") ? "L" : stick.startsWith("prav") ? "R" : null,
    clubId: idFromHref(club?.getAttribute("href"), "klub"),
    clubName: clean(club?.text) || null,
  };
}
