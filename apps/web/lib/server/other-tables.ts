import { unstable_cache } from "next/cache";
import {
  addDays,
  computeGroupTables,
  esportsUrls,
  parseHokejczTableGroups,
  parseScoreboard,
  pragueDate,
  type Game,
  type GroupSpec,
  type HokejczStandingRow,
} from "@hokejhub/core";
import { fetchJson } from "./fetcher";
import { getScoreboard } from "./scoreboard";

const ORIGIN = process.env.HOKEJCZ_ORIGIN ?? "https://www.hokej.cz/";

/**
 * Competitions without our own database whose current table hokej.cz publishes. `groups` is
 * the season's group structure, for computing the table from results when hokej.cz cannot be
 * read (its Cloudflare refuses datacenter addresses): a few clubs per group are enough to tell
 * which group is which.
 */
export const OTHER_TABLES: Record<string, { name: string; path: string; groups: GroupSpec[] }> = {
  "cz-maxa": { name: "Maxa liga", path: "maxa-liga/table", groups: [{ title: "Maxa liga" }] },
  "cz-2liga": {
    name: "2. liga",
    path: "druha-liga/table",
    groups: [
      { title: "2. liga – Západ", markers: ["Cheb", "Kralupy", "Děčín", "Kadaň", "Vrchlabí", "Benátky"] },
      { title: "2. liga – Východ", markers: ["Poruba", "Znojmo", "Opava", "Kroměříž", "Hodonín", "Kopřivnice"] },
    ],
  },
  "cz-u20": { name: "Extraliga juniorů", path: "mladez/table/kb-extraliga-junioru/4", groups: [{ title: "Extraliga juniorů – základní část" }] },
  "cz-u20-2": {
    name: "Liga juniorů",
    path: "mladez/table/liga-junioru/9",
    groups: [
      { title: "Liga juniorů – Západ", markers: ["Tábor", "Chomutov", "Kolín", "Písek", "Litoměřice"] },
      { title: "Liga juniorů – Východ", markers: ["Zlín", "Olomouc", "Přerov", "Vsetín", "Šumperk"] },
    ],
  },
  "cz-u17": { name: "Extraliga dorostu", path: "mladez/table/ccm-extraliga-st-dorostu/5", groups: [{ title: "Extraliga staršího dorostu – základní část" }] },
  "cz-u16": {
    name: "Extraliga mladšího dorostu",
    path: "mladez/table/extraliga-ml-dorostu/6",
    groups: [
      { title: "ELMD – A", markers: ["Salzburg", "Karlovy Vary", "Kladno", "Chomutov", "Pilsen"] },
      { title: "ELMD – B", markers: ["Jihlava", "Liberec", "Sparta", "Pardubice", "Warriors"] },
      { title: "ELMD – C", markers: ["Třinec", "Kometa", "Vítkovice", "Poruba", "Frýdek"] },
    ],
  },
};

export interface OtherTableGroup {
  title: string;
  rows: (HokejczStandingRow & { logo: string | null })[];
  /** Computed from the live feed's results (hokej.cz could not be read). */
  computed?: boolean;
}

const norm = (s: string) =>
  s
    .toLocaleLowerCase("cs")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(hc|sk|hk|bk|sc|hs|tj|j|sd|md|z\.s\.|a\.s\.)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * The current table of a competition from hokej.cz (every group), with club logos borrowed from
 * the live feed's games of the past and coming days (hokej.cz tables carry names only).
 */
export async function getOtherTable(league: string): Promise<OtherTableGroup[] | null> {
  const def = OTHER_TABLES[league];
  if (!def) return null;
  const [res, ...boards] = await Promise.all([
    fetchJson(new URL(def.path, ORIGIN).toString(), (html) => parseHokejczTableGroups(html as string), { revalidate: 600, text: true }),
    ...[-3, -2, -1, 0, 1, 2, 3].map((d) => getScoreboard(addDays(pragueDate(), d)).catch(() => null)),
  ]);
  if (!res.data?.length) return computedTable(league);
  // the competition's own games first, then any Czech club of the same name (youth feeds differ)
  const own = new Map<string, string>();
  const any = new Map<string, string>();
  for (const b of boards)
    for (const g of b?.games ?? [])
      if (g.leagueKey !== "nhl" && g.leagueKey !== "nhl-pre")
        for (const t of [g.home, g.away]) {
          if (!t.logoUrl) continue;
          if (g.leagueKey === league) own.set(norm(t.name), t.logoUrl);
          else if (!any.has(norm(t.name))) any.set(norm(t.name), t.logoUrl);
        }
  const lookup = (logos: Map<string, string>, k: string) => {
    if (logos.has(k)) return logos.get(k)!;
    for (const [name, url] of logos) if (name && (k.includes(name) || name.includes(k))) return url;
    return null;
  };
  const logoFor = (team: string) => {
    const k = norm(team);
    return lookup(own, k) ?? lookup(any, k);
  };
  return res.data.map((g) => ({ title: g.title, rows: g.rows.map((r) => ({ ...r, logo: logoFor(r.team) })) }));
}

/** The current season's start year (hockey seasons start in summer). */
const seasonStart = (today: string) => {
  const [y, m] = today.split("-").map(Number) as [number, number];
  return `${m >= 7 ? y : y - 1}-08-01`;
};

/** Every game of the live feed since the season started, one day file at a time. */
async function seasonGames(today: string): Promise<Game[]> {
  const dates: string[] = [];
  for (let d = seasonStart(today); d <= today; d = addDays(d, 1)) dates.push(d);
  const games = new Map<string, Game>();
  // A finished day does not change any more: read it from the data cache for a week.
  const recent = addDays(today, -2);
  for (let i = 0; i < dates.length; i += 12) {
    const chunk = await Promise.all(
      dates.slice(i, i + 12).map((d) =>
        fetchJson(esportsUrls.scoreboard(d), parseScoreboard, { revalidate: d < recent ? 7 * 86400 : 300, notFoundIsEmpty: true }).catch(() => null),
      ),
    );
    for (const day of chunk) for (const g of day?.data ?? []) games.set(g.id, g);
  }
  return [...games.values()];
}

async function computeTable(league: string, today: string): Promise<OtherTableGroup[] | null> {
  const def = OTHER_TABLES[league];
  if (!def) return null;
  const all = await seasonGames(today);
  const games = all.filter((g) => g.leagueKey === league && g.status === "final" && g.homeScore !== null && g.awayScore !== null && !g.series);
  if (!games.length) return null;
  const logos = new Map<string, string | null>();
  for (const g of games) {
    logos.set(g.home.id, g.home.logoUrl ?? null);
    logos.set(g.away.id, g.away.logoUrl ?? null);
  }
  const tables = computeGroupTables(
    games.map((g) => ({
      id: g.id,
      startAt: g.startAt,
      homeId: g.home.id,
      awayId: g.away.id,
      homeName: g.home.name,
      awayName: g.away.name,
      homeScore: g.homeScore!,
      awayScore: g.awayScore!,
      decidedIn: g.decidedIn,
    })),
    def.groups,
  );
  return tables.map((t) => ({
    title: t.title,
    computed: true,
    rows: t.rows.map((r) => ({
      rank: r.rank,
      team: r.teamName,
      values: { V: String(r.w), VP: String(r.otw), ...(r.t ? { R: String(r.t) } : {}), PP: String(r.otl), P: String(r.l), Skóre: `${r.gf}:${r.ga}` },
      gp: r.gp,
      w: r.w,
      otw: r.otw,
      ties: r.t,
      otl: r.otl,
      l: r.l,
      gf: r.gf,
      ga: r.ga,
      pts: r.pts,
      logo: logos.get(r.teamId) ?? null,
    })),
  }));
}

const cachedComputeTable = unstable_cache(computeTable, ["computed-table-v1"], { revalidate: 600 });

/** A competition's table computed from the season's results in the live feed. */
export function computedTable(league: string) {
  return cachedComputeTable(league, pragueDate()).catch((e) => (console.error("[table] computed", e), null));
}

interface NhlStanding {
  teamName: { default: string };
  teamCommonName?: { default: string };
  teamAbbrev: { default: string };
  teamLogo: string;
  conferenceName: string;
  divisionName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  goalFor: number;
  goalAgainst: number;
  leagueSequence: number;
  conferenceSequence: number;
  divisionSequence: number;
}

export type NhlView = "divize" | "konference" | "liga";

const CS_NAMES: Record<string, string> = {
  Eastern: "Východní konference",
  Western: "Západní konference",
  Atlantic: "Atlantická divize",
  Metropolitan: "Metropolitní divize",
  Central: "Centrální divize",
  Pacific: "Pacifická divize",
};

/** The NHL's current standings from the league API, grouped by division, conference or the whole league. */
export async function getNhlTable(view: NhlView): Promise<OtherTableGroup[] | null> {
  const res = await fetchJson(
    "https://api-web.nhle.com/v1/standings/now",
    (j) => ((j as { standings?: NhlStanding[] }).standings ?? []),
    { revalidate: 600 },
  );
  const list = res.data;
  if (!list?.length) return null;
  const key = (s: NhlStanding) => (view === "divize" ? s.divisionName : view === "konference" ? s.conferenceName : "NHL");
  const seq = (s: NhlStanding) => (view === "divize" ? s.divisionSequence : view === "konference" ? s.conferenceSequence : s.leagueSequence);
  const groups = new Map<string, NhlStanding[]>();
  for (const s of list) groups.set(key(s), [...(groups.get(key(s)) ?? []), s]);
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, rows]) => ({
      title: CS_NAMES[name] ?? name,
      rows: rows
        .sort((a, b) => seq(a) - seq(b))
        .map((s) => ({
          rank: seq(s),
          team: s.teamCommonName?.default ?? s.teamName.default,
          values: { V: String(s.wins), PP: String(s.otLosses), P: String(s.losses), "Skóre": `${s.goalFor}:${s.goalAgainst}` },
          gp: s.gamesPlayed,
          w: s.wins,
          otw: null,
          ties: null,
          otl: s.otLosses,
          l: s.losses,
          gf: s.goalFor,
          ga: s.goalAgainst,
          pts: s.points,
          logo: s.teamLogo,
        })),
    }));
}
