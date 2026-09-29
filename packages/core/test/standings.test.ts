import { describe, expect, it } from "vitest";
import { computeOverUnder, computeStandings, type ResultGame } from "../src/model/standings.ts";

const g = (id: string, d: string, h: string, a: string, hs: number, as: number, dec: ResultGame["decidedIn"] = "REG"): ResultGame => ({
  id, startAt: `2026-10-${d}T17:00:00Z`, homeId: h, awayId: a, homeName: h, awayName: a, homeScore: hs, awayScore: as, decidedIn: dec,
});
const games = [
  g("1", "01", "A", "B", 3, 1),
  g("2", "02", "B", "C", 2, 1, "OT"),
  g("3", "03", "C", "A", 4, 3, "SO"),
  g("4", "04", "A", "C", 5, 2),
];

describe("standings", () => {
  it("awards 3-2-1-0 and sorts", () => {
    const t = computeStandings(games);
    expect(t.map((r) => [r.teamId, r.pts])).toEqual([["A", 7], ["C", 3], ["B", 2]]);
    expect(t[0]).toMatchObject({ gp: 3, w: 2, otl: 1, gf: 11, ga: 7, form: ["W", "OTL", "W"] });
  });
  it("home split and form table", () => {
    expect(computeStandings(games, { split: "home" }).find((r) => r.teamId === "A")!.gp).toBe(2);
    expect(computeStandings(games, { lastN: 1 }).find((r) => r.teamId === "A")!.pts).toBe(3);
  });
  it("over/under ignores the shootout goal", () => {
    const ou = computeOverUnder(games, 5.5);
    const a = ou.find((r) => r.teamId === "A")!;
    // A: 4 (under), 6 (7-1 SO → over), 7 (over)
    expect([a.over, a.under]).toEqual([2, 1]);
  });
});

import { rulesForSeason } from "../src/model/standings.ts";

describe("historical rules", () => {
  it("reproduces published tables of each era", () => {
    const pts = (s: number, w: number, otw: number, t: number, otl: number) => {
      const r = rulesForSeason(s);
      return w * r.win + otw * r.otWin + t * r.tie + otl * r.otLoss;
    };
    expect(pts(1993, 24, 0, 8, 0)).toBe(56); // Kladno 1993/94
    expect(pts(1998, 33, 0, 12, 0)).toBe(78); // Vsetín 1998/99
    expect(pts(2005, 32, 1, 5, 3)).toBe(106); // Liberec 2005/06
    expect(pts(2006, 28, 6, 0, 4)).toBe(100); // Liberec 2006/07
  });
  it("counts level games as ties", () => {
    const tie: ResultGame = { id: "t", startAt: "1995-10-01T17:00:00Z", homeId: "A", awayId: "B", homeName: "A", awayName: "B", homeScore: 2, awayScore: 2, decidedIn: "REG" };
    const t = computeStandings([tie], { rules: rulesForSeason(1995) });
    expect(t.map((r) => [r.t, r.pts])).toEqual([[1, 1], [1, 1]]);
  });
});
