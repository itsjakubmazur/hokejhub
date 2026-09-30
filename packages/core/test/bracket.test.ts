import { describe, expect, it } from "vitest";
import { buildPlayoffBracket, stageOf, type PlayoffGame } from "../src/model/bracket.ts";

let n = 0;
const g = (round: string, h: string, a: string, hs: number, as: number, day: number): PlayoffGame => ({
  id: `g${n++}`,
  startAt: `2025-03-${String(day).padStart(2, "0")}T17:00:00Z`,
  homeId: h,
  awayId: a,
  homeName: h.toUpperCase(),
  awayName: a.toUpperCase(),
  homeScore: hs,
  awayScore: as,
  decidedIn: "REG",
  round,
});

describe("bracket", () => {
  it("parses stage names", () => {
    expect(stageOf("Čtvrtfinále 3. kolo")).toBe("Čtvrtfinále");
    expect(stageOf("Finále")).toBe("Finále");
    expect(stageOf(null)).toBeNull();
  });

  it("builds series, winners and feeder order", () => {
    const games = [
      g("Semifinále 1. kolo", "a", "d", 3, 1, 1),
      g("Semifinále 1. kolo", "b", "c", 1, 2, 1),
      g("Semifinále 2. kolo", "a", "d", 2, 1, 3),
      g("Semifinále 2. kolo", "b", "c", 4, 0, 3),
      g("Semifinále 3. kolo", "c", "b", 1, 0, 5),
      g("Finále 1. kolo", "a", "c", 5, 2, 10),
      g("Finále 2. kolo", "a", "c", 1, 2, 12),
    ];
    const seeds = new Map([["a", 1], ["b", 2], ["c", 3], ["d", 4]]);
    const [sf, f] = buildPlayoffBracket(games, seeds);
    expect(sf!.name).toBe("Semifinále");
    expect(f!.name).toBe("Finále");
    const ad = sf!.series.find((s) => s.top === "a")!;
    expect([ad.topWins, ad.bottomWins, ad.winner]).toEqual([2, 0, "a"]);
    const bc = sf!.series.find((s) => s.top === "b")!;
    expect([bc.topWins, bc.bottomWins, bc.winner]).toEqual([1, 2, "c"]);
    expect(f!.series[0]!.winner).toBeNull();
    expect(sf!.bestOf).toBe(3);
  });
});
