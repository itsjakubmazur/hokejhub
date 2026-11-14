import {
  czechResults,
  HOKEJCZ_HISTORY_PAGES,
  HOKEJCZ_NATIONAL_PAGES,
  MODERN_WC,
  modernTournaments,
  parseHokejczHistory,
  parseHokejczNational,
  parseHokejczNationalGames,
  type HistorySeason,
  type NationalTournament,
} from "@hokejhub/core";
import { fetchJson } from "./fetcher";
import csSnapshot from "./data/history-cs.json";
import nationalSnapshot from "./data/history-national.json";

const ORIGIN = process.env.HOKEJCZ_ORIGIN ?? "https://www.hokej.cz/";

/*
 * hokej.cz's Cloudflare refuses datacenter addresses (Vercel), and this history does not change:
 * the pages are read once from a home connection by `scripts/snapshot-history.ts` and kept in
 * `data/`. Only the results of the modern world championships are still tried live (a new
 * tournament every May), with the snapshot behind them.
 */
const CS_SNAPSHOT = csSnapshot as HistorySeason[];
const NATIONAL_SNAPSHOT = nationalSnapshot as { written: NationalTournament[]; results: Record<string, string | null> };

/** Czechoslovak top-flight seasons 1936/37–1992/93 (from the snapshot of hokej.cz's history pages). */
export async function getCzechoslovakHistory(): Promise<HistorySeason[]> {
  return CS_SNAPSHOT.length ? CS_SNAPSHOT : loadCzechoslovakHistory();
}

/** The same, read from hokej.cz's history pages (cached a week). */
export async function loadCzechoslovakHistory(): Promise<HistorySeason[]> {
  const pages = HOKEJCZ_HISTORY_PAGES.filter((p) => Number(p.label.slice(0, 4)) < 1993);
  const results = await Promise.all(
    pages.map((p) =>
      fetchJson(new URL(`historie/stranka/${p.id}`, ORIGIN).toString(), (html) => parseHokejczHistory(html as string), {
        revalidate: 7 * 86400,
        text: true,
      }),
    ),
  );
  const seasons = new Map<number, HistorySeason>();
  for (const r of results) for (const s of r.data ?? []) if (s.season < 1993) seasons.set(s.season, s);
  return [...seasons.values()].sort((a, b) => a.season - b.season);
}

/** Groups historical club names into one franchise for the titles table. */
const FAMILIES: [RegExp, string][] = [
  [/^i\. ?čltk/i, "I. ČLTK Praha"],
  [/^ltc/i, "LTC Praha"],
  [/jihlava/i, "Dukla Jihlava"],
  [/brno/i, "Brno (Rudá hvězda / ZKL / Kometa)"],
  [/kladno/i, "Kladno"],
  [/sparta/i, "Sparta Praha"],
  [/pardubice/i, "Pardubice"],
  [/košice/i, "Košice"],
  [/vítkovice/i, "Vítkovice"],
  [/bratislava|slovan/i, "Slovan Bratislava"],
  [/trenčín/i, "Dukla Trenčín"],
  [/^atk/i, "ATK Praha"],
  [/budějovice/i, "České Budějovice"],
];

export function franchiseOf(name: string) {
  for (const [re, label] of FAMILIES) if (re.test(name)) return label;
  return name;
}

/**
 * World championships 1920 → today: the written history on hokej.cz up to 1999 (incl. Olympic
 * tournaments), then the curated list with our results read from each tournament's match list.
 */
export async function getNationalHistory(): Promise<NationalTournament[]> {
  const [written, live] = await Promise.all([
    NATIONAL_SNAPSHOT.written.length ? NATIONAL_SNAPSHOT.written : loadNationalWritten(),
    // only tournaments the snapshot has no result for yet (a new one each May)
    loadModernResults((year) => NATIONAL_SNAPSHOT.results[String(year)] == null),
  ]);
  const byYear = new Map<number, NationalTournament>();
  for (const t of written) byYear.set(t.year, t);
  for (const t of modernTournaments())
    byYear.set(t.year, { ...t, results: live.get(t.year) ?? NATIONAL_SNAPSHOT.results[String(t.year)] ?? null });
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

/** World championships up to 1999 as hokej.cz's history pages describe them. */
export async function loadNationalWritten(): Promise<NationalTournament[]> {
  const pages = await Promise.all(
    HOKEJCZ_NATIONAL_PAGES.map((p) =>
      fetchJson(new URL(`historie/stranka/${p.id}`, ORIGIN).toString(), (html) => parseHokejczNational(html as string), {
        revalidate: 7 * 86400,
        text: true,
      }),
    ),
  );
  return pages.flatMap((p) => p.data ?? []);
}

/** Our results at each modern world championship, from its match list on hokej.cz (when it answers). */
export async function loadModernResults(want: (year: number) => boolean = () => true): Promise<Map<number, string | null>> {
  return new Map(
    await Promise.all(
      MODERN_WC.filter((w) => w.competitionIds.length && want(w.year)).map(async (w) => {
        const lists = await Promise.all(
          w.competitionIds.map((id) =>
            fetchJson(new URL(`reprezentace/zapasy/15?competitionId=${id}`, ORIGIN).toString(), (html) => parseHokejczNationalGames(html as string), {
              revalidate: 7 * 86400,
              text: true,
            }),
          ),
        );
        return [w.year, czechResults(lists.flatMap((l) => l.data ?? []), w)] as const;
      }),
    ),
  );
}
