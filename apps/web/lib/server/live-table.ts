import { esportsUrls, parseScoreboardAlt, pragueDate, type ResultGame } from "@hokejhub/core";
import { fetchJson } from "./fetcher";

/** ELH games in progress right now, as provisional results keyed by our DB team ids. */
export async function getLiveElhGames(): Promise<(ResultGame & { live: string })[]> {
  const res = await fetchJson(esportsUrls.scoreboardAlt(pragueDate()), parseScoreboardAlt, { revalidate: 20, notFoundIsEmpty: true });
  return (res.data ?? [])
    .filter((g) => g.leagueKey === "cz-elh" && (g.status === "live" || g.status === "intermission"))
    .filter((g) => g.home.hokejczClubId && g.away.hokejczClubId && g.homeScore !== null && g.awayScore !== null)
    .map((g) => ({
      id: `live-${g.id}`,
      startAt: g.startAt,
      homeId: `hcz-${g.home.hokejczClubId}`,
      awayId: `hcz-${g.away.hokejczClubId}`,
      homeName: g.home.name,
      awayName: g.away.name,
      homeScore: g.homeScore!,
      awayScore: g.awayScore!,
      decidedIn: g.period && g.period > 3 ? "OT" : "REG",
      live: g.statusLabel,
    }));
}
