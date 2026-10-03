import { addDays, parseHokejczTableGroups, pragueDate, type HokejczStandingRow } from "@hokejhub/core";
import { fetchJson } from "./fetcher";
import { getScoreboard } from "./scoreboard";

const ORIGIN = process.env.HOKEJCZ_ORIGIN ?? "https://www.hokej.cz/";

/** Competitions without our own database whose current table hokej.cz publishes. */
export const OTHER_TABLES: Record<string, { name: string; path: string }> = {
  "cz-maxa": { name: "Maxa liga", path: "maxa-liga/table" },
  "cz-2liga": { name: "2. liga", path: "druha-liga/table" },
  "cz-u20": { name: "Extraliga juniorů", path: "mladez/table/kb-extraliga-junioru/4" },
  "cz-u20-2": { name: "Liga juniorů", path: "mladez/table/liga-junioru/9" },
  "cz-u17": { name: "Extraliga dorostu", path: "mladez/table/ccm-extraliga-st-dorostu/5" },
  "cz-u16": { name: "Extraliga mladšího dorostu", path: "mladez/table/extraliga-ml-dorostu/6" },
};

export interface OtherTableGroup {
  title: string;
  rows: (HokejczStandingRow & { logo: string | null })[];
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
  if (!res.data) return null;
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
