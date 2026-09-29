import { describe, expect, it } from "vitest";
import today from "./fixtures/nhl-score.json";
import past from "./fixtures/nhl-score-final.json";
import pbp from "./fixtures/nhl-pbp.json";
import live from "./fixtures/scoreboard-live.json";
import { parseNhlScore, parseNhlShots } from "../src/sources/nhl.ts";
import { parseScoreboard } from "../src/sources/esports.ts";
import { combineScoreboard } from "../src/domain/merge.ts";
import { impliedProbs, overround } from "../src/model/market.ts";

describe("NHL score", () => {
  it("parses scheduled games", () => {
    const games = parseNhlScore(today);
    expect(games.length).toBeGreaterThan(0);
    expect(games[0]!.status).toBe("scheduled");
    expect(games[0]!.homeScore).toBeNull();
  });

  it("parses finished games incl. OT and per-period goals", () => {
    const games = parseNhlScore(past);
    const bos = games.find((g) => g.id === "nhl-2025021012")!;
    expect(bos).toMatchObject({ status: "final", decidedIn: "OT", homeScore: 2, awayScore: 1, statusLabel: "po prodl." });
    const sum = bos.periods.reduce((a, [h, v]) => [a[0]! + h, a[1]! + v], [0, 0]);
    expect(sum).toEqual([2, 1]);
  });
});

describe("NHL shots", () => {
  it("extracts shots with normalised coordinates", () => {
    const shots = parseNhlShots(pbp);
    expect(shots.filter((s) => s.type === "goal").length).toBe(9);
    const withCoords = shots.filter((s) => s.x !== null && s.type !== "blocked-shot");
    // After normalisation almost all unblocked attempts come from the attacking half.
    const attackingHalf = withCoords.filter((s) => s.x! > 0).length / withCoords.length;
    expect(attackingHalf).toBeGreaterThan(0.95);
  });
});

describe("merge", () => {
  it("attaches Tipsport odds to NHL games and drops eSports duplicates", () => {
    const es = parseScoreboard(live);
    const merged = combineScoreboard(es, parseNhlScore(today));
    const car = merged.find((g) => g.source === "nhl" && g.home.abbrev === "CAR");
    expect(car?.preOdds?.home).toBeGreaterThan(1);
    expect(car?.external.onlajnyId).toBe(544101);
    expect(merged.filter((g) => g.leagueKey === "nhl" && g.source === "esports")).toEqual([]);
  });
});

describe("market", () => {
  it("removes margin", () => {
    const o = { home: 2.2, draw: 4.2, away: 2.6 };
    const p = impliedProbs(o)!;
    expect(p.home + p.draw + p.away).toBeCloseTo(1);
    expect(overround(o)!).toBeGreaterThan(0);
  });
});

describe("merge aliases", () => {
  it("matches every NHL game of the night incl. VEG/VGK", () => {
    const merged = combineScoreboard(parseScoreboard(live), parseNhlScore(today));
    const nhl = merged.filter((g) => g.source === "nhl");
    expect(nhl.length).toBe(5);
    expect(nhl.every((g) => g.external.onlajnyId)).toBe(true);
  });
});
