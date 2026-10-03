export interface LeagueInfo {
  key: string;
  name: string;
  shortName: string;
  group: "cz" | "cz-youth" | "cz-women" | "nhl" | "intl" | "other";
  /** Lower = shown first. */
  sort: number;
}

const LEAGUES: LeagueInfo[] = [
  { key: "cz-elh", name: "Tipsport extraliga", shortName: "ELH", group: "cz", sort: 1 },
  { key: "nhl", name: "NHL", shortName: "NHL", group: "nhl", sort: 2 },
  { key: "cz-maxa", name: "Maxa liga", shortName: "Maxa", group: "cz", sort: 3 },
  { key: "cz-2liga", name: "2. liga", shortName: "2. liga", group: "cz", sort: 4 },
  { key: "cz-women", name: "Extraliga žen", shortName: "ELŽ", group: "cz-women", sort: 10 },
  { key: "cz-women-1", name: "1. liga žen", shortName: "1. LŽ", group: "cz-women", sort: 11 },
  { key: "cz-u20", name: "Extraliga juniorů", shortName: "ELJ", group: "cz-youth", sort: 20 },
  { key: "cz-u20-2", name: "Liga juniorů", shortName: "LJ", group: "cz-youth", sort: 21 },
  { key: "cz-u17", name: "Extraliga dorostu", shortName: "ELD", group: "cz-youth", sort: 22 },
  { key: "cz-u16", name: "Extraliga mladšího dorostu", shortName: "ELMD", group: "cz-youth", sort: 23 },
  { key: "cz-u16-2", name: "Liga mladšího dorostu", shortName: "LMD", group: "cz-youth", sort: 24 },
  { key: "nhl-pre", name: "NHL – příprava", shortName: "NHL př.", group: "nhl", sort: 5 },
  { key: "cs-liga", name: "Československá liga", shortName: "ČSHL", group: "cz", sort: 90 },
  { key: "eht-women", name: "Euro Hockey Tour (ženy)", shortName: "EHT Ž", group: "intl", sort: 30 },
];

/** eSports.cz scoreboard league id → our league key. Unknown ids fall back to `es-{id}`. */
const ESPORTS_LEAGUE_IDS: Record<string, string> = {
  "16": "cz-elh",
  "20": "cz-maxa",
  "3470": "cz-2liga",
  "3458": "cz-women",
  "3456": "cz-women-1",
  "33": "cz-u20",
  "36": "cz-u20-2",
  "3465": "cz-u17",
  "35": "cz-u16",
  "100": "cz-u16-2",
  "101": "nhl",
  "2752": "nhl-pre",
  "781": "eht-women",
};

const byKey = new Map(LEAGUES.map((l) => [l.key, l]));

export function leagueKeyFromEsports(esportsId: string): string {
  return ESPORTS_LEAGUE_IDS[esportsId] ?? `es-${esportsId}`;
}

/** Resolves a league key from its display name (used by feeds whose ids differ from ours). */
export function leagueKeyFromName(name: string): string | null {
  const n = name.trim().toLowerCase();
  const hit = LEAGUES.find((l) => l.name.toLowerCase() === n || l.shortName.toLowerCase() === n);
  if (hit) return hit.key;
  if (n === "extraliga" || n === "elh") return "cz-elh";
  return null;
}

export function getLeague(key: string, fallbackName?: string): LeagueInfo {
  return (
    byKey.get(key) ?? {
      key,
      name: fallbackName ?? key,
      shortName: fallbackName ?? key,
      group: "other",
      sort: 100,
    }
  );
}

export function allLeagues(): readonly LeagueInfo[] {
  return LEAGUES;
}

/** Leagues shown by default on the scoreboard (the rest sit behind "Další soutěže"). */
export const DEFAULT_LEAGUES = ["nhl", "cz-elh", "cz-maxa", "cz-2liga", "cz-women"] as const;
