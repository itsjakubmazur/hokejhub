import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseOnlajnyPlayerStats, parseOnlajnyRoster, parseOnlajnySummary } from "../src/sources/onlajny-match.ts";

const fx = (n: string) => JSON.parse(readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8"));

describe("onlajny match data", () => {
  it("parses line-ups into lines", () => {
    const r = parseOnlajnyRoster(fx("onlajny-roster.json"));
    expect(r.available).toBe(true);
    expect(r.home.goalies.length).toBe(2);
    expect(r.home.defence.length).toBeGreaterThanOrEqual(3);
    expect(r.home.forwards.length).toBeGreaterThanOrEqual(4);
    expect(r.home.forwards[0]!.length).toBe(3);
    expect(r.home.coaches.find((c) => c.role === "Hlavní trenér")?.name).toBe("Boris Žabka");
    expect(r.referees.filter((x) => x.role === "referee").length).toBe(2);
    const all = [...r.home.defence.flat(), ...r.home.forwards.flat()].filter(Boolean);
    expect(all.some((p) => p!.role === "c")).toBe(true);
  });

  it("parses team stats per period", () => {
    const s = parseOnlajnySummary(fx("onlajny-summary.json"))!;
    expect(s.periods).toEqual(["1", "2", "3", "total"]);
    expect(s.shotsOnGoal.total).toEqual([37, 27]);
    expect(s.shotsOnGoal["1"]).toEqual([20, 14]);
    expect(s.goals.total).toEqual([6, 4]);
    expect(s.faceoffsWon.total![0]).toBe(36);
  });

  it("parses player stats per period", () => {
    const p = parseOnlajnyPlayerStats(fx("onlajny-player-stats.json"))!;
    expect(p.home.length).toBeGreaterThan(15);
    const pyrochta = p.home.find((x) => x.name === "Filip Pyrochta")!;
    expect(pyrochta).toMatchObject({ goals: 1, toi: 1148, shifts: 23 });
    expect(pyrochta.periods.length).toBe(3);
    expect(pyrochta.periods.reduce((a, x) => a + x.toi, 0)).toBe(1148);
  });
});
