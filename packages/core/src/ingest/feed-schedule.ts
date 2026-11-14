/**
 * Extraliga games from the live feed, for the schedule hokej.cz's season pages used to give the
 * crawler: hokej.cz refuses datacenter addresses, the feed (json.esports.cz) does not. Play-off
 * and relegation rounds appear here as they are drawn, with their series state.
 */
import type { Game } from "../domain/types.ts";
import { job, seasonId, seasonOfDate, type CrawlJob } from "./hokejcz-crawler.ts";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export interface FeedScheduleInput {
  /** Extraliga games of the feed (leagueKey "cz-elh") with a hokej.cz id. */
  game: Game;
  /** hokej.cz club ids of both sides, when the feed's ELH variant gives them. */
  clubs: { home: number | null; away: number | null };
  /** This season's extraliga clubs, to match a side the variant gives no id for. */
  teams: { id: string; abbrev: string; name: string }[];
  /** Team ids that played this season's regular part. */
  regularTeams: Set<string>;
}

export interface FeedScheduleRow {
  game: Record<string, unknown>;
  job: CrawlJob;
}

/**
 * The game row (and crawl job) for an extraliga game the feed lists. Play-off and relegation
 * games carry a series state; a series with a club from outside the extraliga's regular part is
 * the relegation round (baráž), any other the play-off. Null when a side cannot be matched to a
 * club of ours.
 */
export function feedScheduleRow({ game: g, clubs, teams, regularTeams }: FeedScheduleInput): FeedScheduleRow | null {
  const hczId = g.external.hokejczId;
  if (!hczId) return null;
  // By abbreviation, else by name: the feed and hokej.cz mostly agree on abbreviations, not
  // always (Hradec Králové is "HKM" in the feed, "MHK" on hokej.cz).
  const teamId = (club: number | null, side: Game["home"]) => {
    if (club) return `hcz-${club}`;
    const byAbbrev = teams.filter((t) => t.abbrev === side.abbrev);
    if (byAbbrev.length === 1) return byAbbrev[0]!.id;
    const byName = teams.filter((t) => norm(t.name) === norm(side.name));
    return byName.length === 1 ? byName[0]!.id : null;
  };
  const home = teamId(clubs.home, g.home);
  const away = teamId(clubs.away, g.away);
  if (!home || !away) return null;
  const season = seasonOfDate(new Date(g.startAt));
  const phase = !g.series ? "regular" : regularTeams.has(home) && regularTeams.has(away) ? "playoff" : "relegation";
  return {
    game: {
      id: `hcz-${hczId}`,
      source: "hokejcz",
      league_id: "cz-elh",
      season_id: seasonId(season),
      start_at: g.startAt,
      home_team_id: home,
      away_team_id: away,
      home_name: g.home.name,
      away_name: g.away.name,
      phase,
      status: g.status === "postponed" || g.status === "cancelled" ? g.status : "scheduled",
      series: g.series,
      external: { hokejczId: hczId, onlajnyId: g.external.onlajnyId ?? null, fromFeed: true },
    },
    job: job.match(hczId, { season, phase }),
  };
}
