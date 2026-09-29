import { HOKEJCZ_HISTORY_PAGES, parseHokejczHistory, type HistorySeason } from "@hokejhub/core";
import { fetchJson } from "./fetcher";

const ORIGIN = process.env.HOKEJCZ_ORIGIN ?? "https://www.hokej.cz/";

/** Czechoslovak top-flight seasons 1936/37–1992/93 from hokej.cz history pages (cached a week). */
export async function getCzechoslovakHistory(): Promise<HistorySeason[]> {
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
