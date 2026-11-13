import { describe, expect, it } from "vitest";
import { computeGroupTables } from "../src/model/group-tables.ts";
import type { ResultGame } from "../src/model/standings.ts";

let n = 0;
const game = (home: string, away: string, hs: number, as: number, decidedIn: ResultGame["decidedIn"] = "REG"): ResultGame => ({
  id: String(n++),
  startAt: `2026-10-${String((n % 28) + 1).padStart(2, "0")}T17:00:00.000Z`,
  homeId: home,
  awayId: away,
  homeName: `HC ${home}`,
  awayName: `HC ${away}`,
  homeScore: hs,
  awayScore: as,
  decidedIn,
});

/** Everyone plays everyone in the group twice; the first team always wins at home. */
function roundRobin(teams: string[]): ResultGame[] {
  const out: ResultGame[] = [];
  for (const a of teams) for (const b of teams) if (a !== b) out.push(game(a, b, teams.indexOf(a) < teams.indexOf(b) ? 4 : 2, teams.indexOf(a) < teams.indexOf(b) ? 1 : 3));
  return out;
}

describe("tables computed from results", () => {
  it("splits teams into groups even with games across them, and names them by their clubs", () => {
    const west = ["Cheb", "Kadaň", "Děčín", "Písek"];
    const east = ["Zlín", "Opava", "Přerov", "Vsetín"];
    // one cross-group game per team, listed first so order does not decide anything
    const cross = west.map((w, i) => game(w, east[i]!, 3, 2, "OT"));
    const tables = computeGroupTables([...cross, ...roundRobin(east), ...roundRobin(west)], [
      { title: "Západ", markers: ["Cheb", "Kadaň"] },
      { title: "Východ", markers: ["Opava"] },
    ]);
    expect(tables.map((t) => t.title)).toEqual(["Západ", "Východ"]);
    expect(tables[0]!.rows.map((r) => r.teamId).sort()).toEqual([...west].sort());
    expect(tables[1]!.rows.map((r) => r.teamId).sort()).toEqual([...east].sort());
    // a line counts the game against the other group too
    const cheb = tables[0]!.rows.find((r) => r.teamId === "Cheb")!;
    expect(cheb).toMatchObject({ gp: 7, w: 6, otw: 1, pts: 20, rank: 1 });
    const zlin = tables[1]!.rows.find((r) => r.teamId === "Zlín")!;
    expect(zlin).toMatchObject({ gp: 7, w: 6, otl: 1, pts: 19 });
  });

  it("one group: all teams in one table, level on points ordered by goal difference", () => {
    const games = [game("A", "B", 3, 0), game("B", "C", 5, 1), game("C", "A", 2, 1), game("D", "A", 0, 1)];
    const [t] = computeGroupTables(games, [{ title: "Liga" }]);
    expect(t!.title).toBe("Liga");
    // A 6 pts (+2), B 3 pts (+1), C 3 pts (−3), D 0
    expect(t!.rows.map((r) => [r.teamId, r.pts, r.rank])).toEqual([
      ["A", 6, 1],
      ["B", 3, 2],
      ["C", 3, 3],
      ["D", 0, 4],
    ]);
  });

  it("games that ended level count as ties", () => {
    const [t] = computeGroupTables([game("A", "B", 2, 2, null)], [{ title: "Dorost" }]);
    expect(t!.rows.map((r) => [r.teamId, r.t, r.pts])).toEqual([
      ["A", 1, 1],
      ["B", 1, 1],
    ]);
  });
});
