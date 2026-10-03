import { parse } from "node-html-parser";

/**
 * A player's career outside the extraliga, from two sources:
 *  - hokej.cz `/hrac/x/{id}/career`: every Czech competition (summed per competition by hokej.cz
 *    itself, extraliga left out — we have it game by game) and the national teams;
 *  - the NHL's player landing (`seasonTotals`): every league worldwide, for players with an NHL
 *    profile. Only leagues outside the Czech Republic are taken from it.
 */

export type CareerGroup = "senior" | "youth" | "national" | "national-youth";

export interface CareerLine {
  label: string;
  group: CareerGroup;
  gp: number;
  g: number | null;
  a: number | null;
  pts: number | null;
  /** Number of clubs (hokej.cz) or seasons (NHL), for context. */
  detail: string | null;
  source: "hokejcz" | "nhl" | "db";
}

const clean = (s: string | undefined | null) => (s ?? "").replace(/\s+/g, " ").trim();
const num = (s: string | undefined) => {
  const n = Number(clean(s));
  return Number.isFinite(n) && clean(s) !== "" ? n : null;
};

const YOUTH = /junior|dorost|ELJ|ELD|ELSD|ELMD|LJ\b|9\. tříd|U ?\d{2}\b|mládež/i;
/** Pre-season cups are not competitive games. */
const CUP = /\bcup\b|pohár|turnaj/i;

export function parseHokejczCareer(html: string): CareerLine[] {
  const root = parse(html);
  const out: CareerLine[] = [];
  let repA = null as CareerLine | null;
  for (const table of root.querySelectorAll("table")) {
    // header rows ("soutěž | klub | z | g …") may repeat inside a table with other columns
    let head: string[] = [];
    for (const tr of table.querySelectorAll("tr")) {
      // the season ("2015-2016") sits in a <th> of a season's first row, so cells are th + td
      let cells = tr.querySelectorAll("th, td").map((c) => clean(c.text));
      if (cells.some((c) => c.toLowerCase() === "soutěž")) {
        const h = cells.map((c) => c.toLowerCase());
        head = h[0] === "" ? h.slice(1) : h;
        continue;
      }
      if (!head.length) continue;
      // a season's first row carries the season ("2015-2016") in an extra leading cell
      if (cells.length > head.length) cells = cells.slice(cells.length - head.length);
      if (cells.length < head.length) continue;
      const col = (name: string) => head.indexOf(name);
      const iz = col("z");
      const ig = col("g");
      const ia = col("a");
      const ib = col("b");
      const hasClub = head[1] === "klub";
      const [competition, club] = cells;
      const line = (label: string, group: CareerGroup, detail: string | null): CareerLine => ({
        label,
        group,
        gp: num(cells[iz]) ?? 0,
        g: ig >= 0 ? num(cells[ig]) : null,
        a: ia >= 0 ? num(cells[ia]) : null,
        pts: ib >= 0 ? num(cells[ib]) : null,
        detail,
        source: "hokejcz",
      });
      if (hasClub && /^\d+ klub/.test(club ?? "")) {
        // per-competition summary of the club career
        if (CUP.test(competition!)) continue;
        out.push(line(competition!, YOUTH.test(competition!) ? "youth" : "senior", club!));
      } else if (hasClub && competition === "Reprezentace A") {
        // the senior national team: one total per season
        const l = line("Reprezentace A", "national", null);
        repA = repA
          ? { ...repA, gp: repA.gp + l.gp, g: sum(repA.g, l.g), a: sum(repA.a, l.a), pts: sum(repA.pts, l.pts) }
          : l;
      } else if (!hasClub && /reprezent/i.test(competition ?? "")) {
        const youth = /mládež/i.test(competition!);
        out.push(line(youth ? "Reprezentace – mládež" : competition!, youth ? "national-youth" : "national", null));
      }
    }
  }
  if (repA) out.push(repA);
  return out;
}

const sum = (x: number | null, y: number | null) => (x == null && y == null ? null : (x ?? 0) + (y ?? 0));

interface NhlSeasonTotal {
  season: number;
  leagueAbbrev: string;
  teamName?: { default?: string };
  gameTypeId: number;
  gamesPlayed?: number;
  goals?: number;
  assists?: number;
  points?: number;
}

/** Czech competitions and national teams come from hokej.cz; the NHL feed adds the rest. */
const NHL_SKIP_LEAGUE = /^(czech|czrep|czechia|cze)|^(wc|wc-a|og|olympics|eht|wcup|wjc|wjc-a|wjc18|wjc-18|whc-17|u18|u17|hlinka|wjac)/i;
const NHL_SKIP_TEAM = /^(czech|czechia|czechoslovakia|czech rep)/i;
const NHL_YOUTH = /u\d{2}|jr|junior|qmjhl|ohl|whl|ushl|mhl|j20|j18|ncaa|usdp|ushs|nahl|bchl|ajhl|sjhl|mjhl|cchl/i;

const LEAGUE_NAMES: Record<string, string> = {
  NHL: "NHL",
  AHL: "AHL",
  KHL: "KHL",
  "Rus-KHL": "KHL",
  NL: "Švýcarsko – National League",
  NLA: "Švýcarsko – National League",
  SHL: "Švédsko – SHL",
  SweHL: "Švédsko – SHL",
  "SM-liiga": "Finsko – Liiga",
  Liiga: "Finsko – Liiga",
  DEL: "Německo – DEL",
  ECHL: "ECHL",
  Slovakia: "Slovensko – Extraliga",
  "Champions HL": "Liga mistrů (CHL)",
  "ICEHL": "Rakousko – ICE liga",
  EBEL: "Rakousko – ICE liga",
  "Rus-1": "Rusko – VHL",
  VHL: "Rusko – VHL",
};

export function parseNhlCareer(seasonTotals: NhlSeasonTotal[]): CareerLine[] {
  const by = new Map<string, CareerLine & { seasons: Set<number> }>();
  for (const s of seasonTotals) {
    if (NHL_SKIP_LEAGUE.test(s.leagueAbbrev) || NHL_SKIP_TEAM.test(s.teamName?.default ?? "")) continue;
    if (s.gameTypeId !== 2 && s.gameTypeId !== 3) continue;
    const label = LEAGUE_NAMES[s.leagueAbbrev] ?? s.leagueAbbrev;
    const cur =
      by.get(label) ??
      ({ label, group: NHL_YOUTH.test(s.leagueAbbrev) ? "youth" : "senior", gp: 0, g: 0, a: 0, pts: 0, detail: null, source: "nhl", seasons: new Set() } as CareerLine & {
        seasons: Set<number>;
      });
    cur.gp += s.gamesPlayed ?? 0;
    cur.g = (cur.g ?? 0) + (s.goals ?? 0);
    cur.a = (cur.a ?? 0) + (s.assists ?? 0);
    cur.pts = (cur.pts ?? 0) + (s.points ?? (s.goals ?? 0) + (s.assists ?? 0));
    cur.seasons.add(s.season);
    by.set(label, cur);
  }
  return [...by.values()].map(({ seasons, ...l }) => ({
    ...l,
    detail: `${seasons.size} ${seasons.size === 1 ? "sezóna" : seasons.size < 5 ? "sezóny" : "sezón"}`,
  }));
}

/** "Roman Červenka" ≈ "Roman Cervenka": names compared without diacritics and case. */
export function sameName(a: string, b: string) {
  const n = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z]+/g, " ")
      .trim();
  return n(a) === n(b);
}
