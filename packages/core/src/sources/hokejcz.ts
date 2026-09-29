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
  periods: [number, number][];
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

/** Parses a hokej.cz match page (`/zapas/{id}/`). Older matches may lack some sections. */
export function parseHokejczMatch(html: string, id: number): HokejczMatch {
  const root = parse(html);
  const page = root.querySelector(".page.match") ?? root;

  const headingItems = page.querySelectorAll(".heading li").map((li) => clean(li.text));
  const scoreEl = page.querySelector(".match-score .score");
  const scoreMeta = scoreEl?.querySelectorAll("div span").map((s) => clean(s.text)) ?? [];

  const periods = (scoreMeta[1] ?? "")
    .split(",")
    .map((p) => pair(p))
    .filter((p): p is [number, number] => p !== null);

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
