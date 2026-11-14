import { describe, expect, it } from "vitest";
import type { Game } from "../src/domain/types.ts";
import { feedScheduleRow } from "../src/ingest/feed-schedule.ts";

const team = (abbrev: string, name: string) => ({ id: `cz-${abbrev}`, name, shortName: name, abbrev, logoUrl: null });
const game = (over: Partial<Game> = {}): Game => ({
  id: "cz-529958",
  source: "esports",
  leagueKey: "cz-elh",
  leagueName: "Tipsport extraliga",
  startAt: "2027-04-11T14:30:00.000Z",
  status: "scheduled",
  statusLabel: "před zápasem",
  period: null,
  clock: null,
  home: team("TRI", "HC Oceláři Třinec"),
  away: team("KVA", "HC Energie Karlovy Vary"),
  homeScore: null,
  awayScore: null,
  periods: [],
  decidedIn: null,
  series: "3:1",
  preOdds: null,
  external: { hokejczId: 2927830, onlajnyId: 529958 },
  ...over,
});
const teams = [
  { id: "hcz-11", abbrev: "TRI", name: "HC Oceláři Třinec" },
  { id: "hcz-19", abbrev: "KVA", name: "HC Energie Karlovy Vary" },
  { id: "hcz-1711", abbrev: "MHK", name: "Mountfield HK" },
];
const regularTeams = new Set(["hcz-11", "hcz-19"]);

describe("schedule from the live feed", () => {
  it("a play-off game: clubs from the ELH feed variant, phase from the series", () => {
    const r = feedScheduleRow({ game: game(), clubs: { home: 11, away: 19 }, teams, regularTeams })!;
    expect(r.game).toMatchObject({
      id: "hcz-2927830",
      league_id: "cz-elh",
      season_id: "cz-elh-2026",
      home_team_id: "hcz-11",
      away_team_id: "hcz-19",
      phase: "playoff",
      status: "scheduled",
      series: "3:1",
    });
    expect(r.job).toMatchObject({ key: "hcz:match:2927830", kind: "match", params: { id: 2927830, season: 2026, phase: "playoff" } });
  });

  it("clubs by abbreviation when the variant has no ids; no series is the regular part", () => {
    const r = feedScheduleRow({ game: game({ series: null }), clubs: { home: null, away: null }, teams, regularTeams })!;
    expect(r.game).toMatchObject({ home_team_id: "hcz-11", away_team_id: "hcz-19", phase: "regular" });
  });

  it("a club whose abbreviation differs is found by its name", () => {
    const r = feedScheduleRow({ game: game({ series: null, away: team("HKM", "Mountfield HK") }), clubs: { home: null, away: null }, teams, regularTeams })!;
    expect(r.game).toMatchObject({ away_team_id: "hcz-1711" });
  });

  it("a series against a club from outside the extraliga is the relegation round", () => {
    const r = feedScheduleRow({ game: game({ away: team("JIH", "HC Dukla Jihlava") }), clubs: { home: 11, away: 16 }, teams, regularTeams })!;
    expect(r.game).toMatchObject({ away_team_id: "hcz-16", phase: "relegation" });
  });

  it("a side we cannot match is skipped", () => {
    expect(feedScheduleRow({ game: game({ away: team("XYZ", "Neznámý") }), clubs: { home: 11, away: null }, teams, regularTeams })).toBeNull();
  });
});
