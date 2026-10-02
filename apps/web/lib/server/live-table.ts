import { addDays, pragueDate, type Game, type ResultGame } from "@hokejhub/core";
import { getScoreboard } from "./scoreboard";

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

/** Today's / a day's extraliga games with hokej.cz club ids resolved by the scoreboard. */
async function elhGames(date: string): Promise<Game[]> {
  const board = await getScoreboard(date);
  return board.games.filter(
    (g) => g.leagueKey === "cz-elh" && g.home.hokejczClubId && g.away.hokejczClubId && g.homeScore !== null && g.awayScore !== null,
  );
}

/** ELH games in progress right now, as provisional results keyed by our DB team ids. */
export async function getLiveElhGames(): Promise<(ResultGame & { live: string })[]> {
  return (await elhGames(pragueDate()))
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
  // The scoreboard resolves hokej.cz club ids for every game (the ELH-only feed omits some).
  const lists = await Promise.all(days.map((d) => elhGames(d).catch(() => [] as Game[])));
  const key = (home: string, away: string, startAt: string) => `${home}|${away}|${pragueDate(new Date(startAt))}`;
  const known = new Set(games.map((g) => key(g.homeId, g.awayId, g.startAt)));
  const pending = lists
    .flat()
    .filter((g) => g.status === "final" && seasonOf(g.startAt) === season)
    .map(toResult)
    .filter((g) => !known.has(key(g.homeId, g.awayId, g.startAt)));
  return pending.length ? [...games, ...pending] : games;
}
