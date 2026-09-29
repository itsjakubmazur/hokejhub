import { describe, expect, it } from "vitest";
import { backtest, liveWinProbability, poisson1x2, predict, rateGames } from "../src/model/elo.ts";
import type { ResultGame } from "../src/model/standings.ts";

describe("prediction model", () => {
  it("poisson 1x2 sums to 1 and favours the stronger side", () => {
    const r = poisson1x2(3.2, 2.4);
    expect(r.home + r.draw + r.away).toBeCloseTo(1, 6);
    expect(r.home).toBeGreaterThan(r.away);
    expect(r.draw).toBeGreaterThan(0.15);
  });
  it("equal teams: home edge from home advantage", () => {
    const p = predict(1500, 1500);
    expect(p.homeWin).toBeGreaterThan(0.5);
    expect(p.homeWin).toBeLessThan(0.6);
  });
  it("rates a dominant team up and backtests", () => {
    const games: ResultGame[] = Array.from({ length: 40 }, (_, i) => ({
      id: String(i), startAt: new Date(Date.UTC(2024, 9, 1 + i)).toISOString(),
      homeId: i % 2 ? "A" : "B", awayId: i % 2 ? "B" : "A", homeName: "A", awayName: "B",
      homeScore: i % 2 ? 4 : 1, awayScore: i % 2 ? 1 : 4, decidedIn: "REG",
    }));
    const s = rateGames(games);
    expect(s.ratings.get("A")!).toBeGreaterThan(s.ratings.get("B")!);
    const bt = backtest(games, s);
    expect(bt.games).toBe(40);
    expect(bt.accuracy).toBeGreaterThan(0.5);
  });
  it("live win probability reacts to score and time", () => {
    expect(liveWinProbability(0, 0, 0, 3, 3)).toBeCloseTo(0.5, 1);
    expect(liveWinProbability(2, 0, 3000, 3, 3)).toBeGreaterThan(0.9);
    expect(liveWinProbability(0, 1, 3590, 3, 3)).toBeLessThan(0.05);
    expect(liveWinProbability(3, 2, 3600, 3, 3)).toBe(1);
  });
});
