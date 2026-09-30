/**
 * World championships from 2000 on. hokej.cz keeps no written history for these years — its
 * "2000 – současnost" page is only an index of tournaments (place, dates, competition id) and
 * the final rankings on its tables are ordered by points, not by the medals actually won. So
 * the placements and podiums here are curated, and the match list of each tournament is read
 * from hokej.cz to give the results of our games.
 */
import type { NationalTournament } from "./hokejcz-history.ts";

export interface ModernWorldChampionship {
  number: number;
  year: number;
  place: string;
  dates: string;
  /** Tournament window, ISO dates (hokej.cz lists friendlies under the same competition). */
  from: string;
  to: string;
  /** hokej.cz competition id for the match list, when the tournament is in its index. */
  competitionId: number | null;
  ourPlace: number | null;
  podium: [string, string, string] | null;
  cancelled?: boolean;
}

export const MODERN_WC: ModernWorldChampionship[] = [
  { number: 64, year: 2000, place: "Petrohrad (Rusko)", dates: "29. dubna – 14. května 2000", from: "2000-04-29", to: "2000-05-14", competitionId: 9, ourPlace: 1, podium: ["Česko", "Slovensko", "Finsko"] },
  { number: 65, year: 2001, place: "Kolín nad Rýnem, Norimberk, Hannover (Německo)", dates: "28. dubna – 13. května 2001", from: "2001-04-28", to: "2001-05-13", competitionId: 23, ourPlace: 1, podium: ["Česko", "Finsko", "Švédsko"] },
  { number: 66, year: 2002, place: "Jönköping, Göteborg, Karlstad (Švédsko)", dates: "26. dubna – 11. května 2002", from: "2002-04-26", to: "2002-05-11", competitionId: 65, ourPlace: 5, podium: ["Slovensko", "Rusko", "Švédsko"] },
  { number: 67, year: 2003, place: "Helsinky, Turku, Tampere (Finsko)", dates: "26. dubna – 11. května 2003", from: "2003-04-26", to: "2003-05-11", competitionId: 419, ourPlace: 4, podium: ["Kanada", "Švédsko", "Slovensko"] },
  { number: 68, year: 2004, place: "Praha, Ostrava (Česko)", dates: "24. dubna – 9. května 2004", from: "2004-04-24", to: "2004-05-09", competitionId: 323, ourPlace: 5, podium: ["Kanada", "Švédsko", "USA"] },
  { number: 69, year: 2005, place: "Vídeň, Innsbruck (Rakousko)", dates: "30. dubna – 15. května 2005", from: "2005-04-30", to: "2005-05-15", competitionId: 438, ourPlace: 1, podium: ["Česko", "Kanada", "Rusko"] },
  { number: 70, year: 2006, place: "Riga (Lotyšsko)", dates: "5. – 21. května 2006", from: "2006-05-05", to: "2006-05-21", competitionId: 549, ourPlace: 2, podium: ["Švédsko", "Česko", "Finsko"] },
  { number: 71, year: 2007, place: "Moskva, Mytišči (Rusko)", dates: "27. dubna – 13. května 2007", from: "2007-04-27", to: "2007-05-13", competitionId: 610, ourPlace: 7, podium: ["Kanada", "Finsko", "Rusko"] },
  { number: 72, year: 2008, place: "Halifax, Quebec (Kanada)", dates: "2. – 18. května 2008", from: "2008-05-02", to: "2008-05-18", competitionId: 670, ourPlace: 5, podium: ["Rusko", "Kanada", "Finsko"] },
  { number: 73, year: 2009, place: "Bern, Kloten (Švýcarsko)", dates: "24. dubna – 10. května 2009", from: "2009-04-24", to: "2009-05-10", competitionId: 727, ourPlace: 6, podium: ["Rusko", "Kanada", "Švédsko"] },
  { number: 74, year: 2010, place: "Kolín nad Rýnem, Mannheim (Německo)", dates: "7. – 23. května 2010", from: "2010-05-07", to: "2010-05-23", competitionId: 790, ourPlace: 1, podium: ["Česko", "Rusko", "Švédsko"] },
  { number: 75, year: 2011, place: "Bratislava, Košice (Slovensko)", dates: "29. dubna – 15. května 2011", from: "2011-04-29", to: "2011-05-15", competitionId: 918, ourPlace: 3, podium: ["Finsko", "Švédsko", "Česko"] },
  { number: 76, year: 2012, place: "Helsinky (Finsko), Stockholm (Švédsko)", dates: "4. – 20. května 2012", from: "2012-05-04", to: "2012-05-20", competitionId: 1083, ourPlace: 3, podium: ["Rusko", "Slovensko", "Česko"] },
  { number: 77, year: 2013, place: "Stockholm (Švédsko), Helsinky (Finsko)", dates: "3. – 19. května 2013", from: "2013-05-03", to: "2013-05-19", competitionId: 1222, ourPlace: 7, podium: ["Švédsko", "Švýcarsko", "USA"] },
  { number: 78, year: 2014, place: "Minsk (Bělorusko)", dates: "9. – 25. května 2014", from: "2014-05-09", to: "2014-05-25", competitionId: 3931, ourPlace: 4, podium: ["Rusko", "Finsko", "Švédsko"] },
  { number: 79, year: 2015, place: "Praha, Ostrava (Česko)", dates: "1. – 17. května 2015", from: "2015-05-01", to: "2015-05-17", competitionId: 4622, ourPlace: 4, podium: ["Kanada", "Rusko", "USA"] },
  { number: 80, year: 2016, place: "Moskva, Petrohrad (Rusko)", dates: "6. – 22. května 2016", from: "2016-05-06", to: "2016-05-22", competitionId: 5805, ourPlace: 5, podium: ["Kanada", "Finsko", "Rusko"] },
  { number: 81, year: 2017, place: "Kolín nad Rýnem (Německo), Paříž (Francie)", dates: "5. – 21. května 2017", from: "2017-05-05", to: "2017-05-21", competitionId: null, ourPlace: 7, podium: ["Švédsko", "Kanada", "Rusko"] },
  { number: 82, year: 2018, place: "Kodaň, Herning (Dánsko)", dates: "4. – 20. května 2018", from: "2018-05-04", to: "2018-05-20", competitionId: null, ourPlace: 7, podium: ["Švédsko", "Švýcarsko", "USA"] },
  { number: 83, year: 2019, place: "Bratislava, Košice (Slovensko)", dates: "10. – 26. května 2019", from: "2019-05-10", to: "2019-05-26", competitionId: null, ourPlace: 4, podium: ["Finsko", "Kanada", "Rusko"] },
  { number: 84, year: 2020, place: "Curych, Lausanne (Švýcarsko)", dates: "8. – 24. května 2020", from: "2020-05-08", to: "2020-05-24", competitionId: null, ourPlace: null, podium: null, cancelled: true },
  { number: 84, year: 2021, place: "Riga (Lotyšsko)", dates: "21. května – 6. června 2021", from: "2021-05-21", to: "2021-06-06", competitionId: null, ourPlace: 7, podium: ["Kanada", "Finsko", "USA"] },
  { number: 85, year: 2022, place: "Tampere, Helsinky (Finsko)", dates: "13. – 29. května 2022", from: "2022-05-13", to: "2022-05-29", competitionId: null, ourPlace: 3, podium: ["Finsko", "Kanada", "Česko"] },
  { number: 86, year: 2023, place: "Tampere (Finsko), Riga (Lotyšsko)", dates: "12. – 28. května 2023", from: "2023-05-12", to: "2023-05-28", competitionId: null, ourPlace: 8, podium: ["Kanada", "Německo", "Lotyšsko"] },
  { number: 87, year: 2024, place: "Praha, Ostrava (Česko)", dates: "10. – 26. května 2024", from: "2024-05-10", to: "2024-05-26", competitionId: null, ourPlace: 1, podium: ["Česko", "Švýcarsko", "Švédsko"] },
  { number: 88, year: 2025, place: "Stockholm (Švédsko), Herning (Dánsko)", dates: "9. – 25. května 2025", from: "2025-05-09", to: "2025-05-25", competitionId: null, ourPlace: 6, podium: ["USA", "Švýcarsko", "Švédsko"] },
  // hokej.cz lists the 2026 play-off under this id (quarter-finals on); the medal games and the
  // final ranking were not published there, so the placement stays open.
  { number: 89, year: 2026, place: "Curych, Fribourg (Švýcarsko)", dates: "15. – 31. května 2026", from: "2026-05-15", to: "2026-05-31", competitionId: 7560, ourPlace: null, podium: null },
];

export interface NationalMatch {
  id: number;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  /** "SO 29. 04." as printed. */
  date: string;
  day: number | null;
  month: number | null;
  periods: string | null;
  /** Heading of the block the game sits under (playoff series, group …), often empty. */
  stage: string;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Match list of a hokej.cz national-team competition page (`/reprezentace/zapasy/15?competitionId=N`). */
export function parseHokejczNationalGames(html: string): NationalMatch[] {
  const out: NationalMatch[] = [];
  const blocks = html.matchAll(/<h3[^>]*>([^<]*)<\/h3>\s*<div class="showcase-matches">([\s\S]*?)<\/div>\s*(?=<h3|<div class="col-m"|$)/g);
  for (const b of blocks) {
    const stage = clean(b[1] ?? "");
    for (const r of b[2]!.matchAll(/<tr data-href="\/zapas\/(\d+)"([\s\S]*?)<\/tr>/g)) {
      const body = r[2]!;
      const names = [...body.matchAll(/preview__name--long">([^<]*)</g)].map((m) => clean(m[1]!));
      const scores = [...body.matchAll(/preview__score[^"]*"><span[^>]*>([^<]*)</g)].map((m) => Number.parseInt(clean(m[1]!), 10));
      const date = clean(/match-start-time">([^<]*)</.exec(body)?.[1] ?? "");
      const dm = /(\d{1,2})\.\s*(\d{1,2})\./.exec(date);
      const periods = /match-start-time">[^<]*<\/span>\s*<span>([^<]*)</.exec(body)?.[1];
      if (names.length < 2) continue;
      out.push({
        id: Number(r[1]),
        home: names[0]!,
        away: names[1]!,
        homeScore: Number.isFinite(scores[0]) ? scores[0]! : null,
        awayScore: Number.isFinite(scores[1]) ? scores[1]! : null,
        date,
        day: dm ? Number(dm[1]) : null,
        month: dm ? Number(dm[2]) : null,
        periods: periods ? clean(periods) : null,
        stage,
      });
    }
  }
  return out;
}

const US = /^(Česko|Česká republika|ČR)$/;

/** Our games inside the tournament window, newest last, as "soupeř výsledek" in our perspective. */
export function czechResults(matches: NationalMatch[], wc: ModernWorldChampionship): string | null {
  const [fy, fm, fd] = wc.from.split("-").map(Number);
  const [ty, tm, td] = wc.to.split("-").map(Number);
  const inWindow = (m: NationalMatch) => {
    if (m.day === null || m.month === null) return false;
    // The window may cross a month (April → May) but never a year boundary.
    const key = m.month * 100 + m.day;
    return key >= fm! * 100 + fd! && key <= tm! * 100 + td! && fy === ty;
  };
  const ours = matches.filter((m) => (US.test(m.home) || US.test(m.away)) && inWindow(m) && m.homeScore !== null);
  if (ours.length === 0) return null;
  // Page order is by stage, not by date: sort by calendar day.
  ours.sort((a, b) => a.month! * 100 + a.day! - (b.month! * 100 + b.day!));
  return ours
    .map((m) => {
      const home = US.test(m.home);
      const opp = home ? m.away : m.home;
      const gf = home ? m.homeScore : m.awayScore;
      const ga = home ? m.awayScore : m.homeScore;
      return `${opp} ${gf}:${ga}`;
    })
    .join(", ");
}

/** Curated championships as the same shape the written history uses. */
export function modernTournaments(): NationalTournament[] {
  return MODERN_WC.map((w) => ({
    number: w.number,
    year: w.year,
    dates: w.dates,
    place: w.place,
    olympic: false,
    ranking: w.podium ? [...w.podium] : [],
    ourPlace: w.ourPlace,
    results: null,
    roster: null,
    notes: w.cancelled ? ["Zrušeno kvůli pandemii covidu-19."] : w.ourPlace === null ? ["Konečné pořadí zatím není v našich datech."] : [],
  }));
}
