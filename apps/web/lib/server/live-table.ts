import { addDays, esportsUrls, parseScoreboardAlt, pragueDate, type Game, type ResultGame } from "@hokejhub/core";
import { fetchJson } from "./fetcher";

const toResult = (g: Game): ResultGame => ({
  id: `feed-${g.id}`,
  startAt: g.startAt,
  homeId: `hcz-${g.home.hokejczClubId}`,
  awayId: `hcz-${g.away.hokejczClubId}`,
  homeName: g.home.name,
  awayName: g.away.name,
  homeScore: g.homeScore!,
  awayScore: g.awayScore!,
  decidedIn: g.decidedIn ?? (g.period && g.period > 3 ? "OT" : "REG"),
});

async function feedGames(date: string, revalidate: number) {
  const res = await fetchJson(esportsUrls.scoreboardAlt(date), parseScoreboardAlt, { revalidate, notFoundIsEmpty: true });
  return (res.data ?? []).filter(
    (g) => g.leagueKey === "cz-elh" && g.home.hokejczClubId && g.away.hokejczClubId && g.homeScore !== null && g.awayScore !== null,
  );
}

/** ELH games in progress right now, as provisional results keyed by our DB team ids. */
export async function getLiveElhGames(): Promise<(ResultGame & { live: string })[]> {
  return (await feedGames(pragueDate(), 20))
    .filter((g) => g.status === "live" || g.status === "intermission")
    .map((g) => ({ ...toResult(g), id: `live-${g.id}`, decidedIn: g.period && g.period > 3 ? "OT" : "REG", live: g.statusLabel }));
}

/**
 * Finished ELH games of the last three days that the database does not hold yet. The crawler
 * stores a game some hours after the final horn; until then the table takes the result from the
 * live feed, so it matches what everybody else shows the moment a game ends.
 */
export async function withPendingFinals(games: ResultGame[], season: number): Promise<ResultGame[]> {
  const today = pragueDate();
  // Seasons start in July; feed games only ever belong to the current one.
  const seasonOf = (iso: string) => {
    const [y, m] = pragueDate(new Date(iso)).split("-").map(Number);
    return m! >= 7 ? y! : y! - 1;
  };
  const days = [today, addDays(today, -1), addDays(today, -2)];
  const lists = await Promise.all(days.map((d, i) => feedGames(d, i === 0 ? 60 : 600).catch(() => [])));
  const key = (home: string, away: string, startAt: string) => `${home}|${away}|${pragueDate(new Date(startAt))}`;
  const known = new Set(games.map((g) => key(g.homeId, g.awayId, g.startAt)));
  const pending = lists
    .flat()
    .filter((g) => g.status === "final" && seasonOf(g.startAt) === season)
    .map(toResult)
    .filter((g) => !known.has(key(g.homeId, g.awayId, g.startAt)));
  return pending.length ? [...games, ...pending] : games;
}
