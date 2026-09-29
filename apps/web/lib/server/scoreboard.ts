import {
  addDays,
  combineScoreboard,
  esportsUrls,
  nhlUrls,
  parseLiveOdds,
  parseNhlScore,
  parseScoreboard,
  parseScoreboardAlt,
  pragueDate,
  type Game,
} from "@hokejhub/core";
import type { ScoreboardResponse } from "../types";
import { fetchJson } from "./fetcher";

/** Cache lifetime in seconds for a scoreboard date: short for today, long for the past. */
export function revalidateFor(date: string): number {
  const today = pragueDate();
  if (date === today || date === addDays(today, -1)) return 20;
  return date < today ? 3600 : 600;
}

const isLive = (g: Game) => g.status === "live" || g.status === "intermission";

export async function getScoreboard(date: string): Promise<ScoreboardResponse> {
  const revalidate = revalidateFor(date);
  // NHL games belong to their North American date, i.e. the "NHL night" that starts on the
  // Prague evening of `date` — the same convention eSports/hokej.cz use.
  const [es, nhl] = await Promise.all([
    fetchJson(esportsUrls.scoreboard(date), parseScoreboard, { revalidate, notFoundIsEmpty: true }),
    fetchJson(nhlUrls.score(date), parseNhlScore, { revalidate }),
  ]);

  // If the main feed fails outright (not a plain 404), fall back to the older ELH-only variant.
  let esGames = es.data ?? [];
  let esState = es.state;
  if (es.state === "error") {
    const alt = await fetchJson(esportsUrls.scoreboardAlt(date), parseScoreboardAlt, {
      revalidate,
      notFoundIsEmpty: true,
    });
    if (alt.data) {
      esGames = alt.data;
      esState = "stale";
    }
  }

  const games = combineScoreboard(esGames, nhl.data).sort(
    (a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id),
  );

  let liveOdds: ScoreboardResponse["liveOdds"] = {};
  let oddsState: ScoreboardResponse["sources"][string] = "empty";
  if (games.some(isLive)) {
    const odds = await fetchJson(esportsUrls.liveOdds(), parseLiveOdds, { revalidate: 20 });
    oddsState = odds.state;
    if (odds.data) liveOdds = Object.fromEntries(odds.data);
  }

  return {
    date,
    games,
    liveOdds,
    sources: {
      esports: esState,
      nhl: nhl.state,
      odds: oddsState,
    },
    fetchedAt: new Date().toISOString(),
  };
}
