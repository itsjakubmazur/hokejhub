import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseNhlBoxscore, parseNhlLandingExtras, parseNhlRightRail } from "../src/sources/nhl-gamecenter.ts";

const fx = (f: string) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8"));

describe("NHL gamecenter extras", () => {
  it("parses boxscore players and goalies", () => {
    const b = parseNhlBoxscore(fx("nhl-gc-boxscore.json"));
    expect(b.skaters.home.length).toBeGreaterThan(15);
    expect(b.skaters.away.find((p) => p.name === "A. Kempe")).toMatchObject({ goals: 1, sog: 5, toi: "20:22" });
    expect(b.goalies.home[0]).toMatchObject({ name: "K. Lankinen", saves: 31, shotsAgainst: 34, decision: "W" });
    expect(b.goalies.home[0]!.headshot).toMatch(/assets\.nhle\.com\/mugs\/nhl\/\d{8}\/[A-Z]{3}\/8480947\.png/);
  });
  it("parses right rail team stats and officials", () => {
    const r = parseNhlRightRail(fx("nhl-gc-right-rail.json"));
    expect(r.teamStats.find((x) => x.key === "sog")).toMatchObject({ home: 25, away: 34 });
    expect(r.teamStats.find((x) => x.key === "powerPlay")).toMatchObject({ homeText: "1/2", home: 1 });
    expect(r.teamStats.find((x) => x.key === "faceoffWinningPctg")!.homeText).toBe("63 %");
    expect(r.referees).toContain("Chris Schlenker");
    expect(r.coaches.away).toBe("D.J. Smith");
  });
  it("parses three stars, penalties and the pre-game matchup", () => {
    const l = parseNhlLandingExtras(fx("nhl-gc-landing.json"));
    expect(l.threeStars[0]).toMatchObject({ star: 1, name: "Z. Buium", team: "VAN" });
    expect(l.penalties[0]).toMatchObject({ period: 1, time: "19:25", reason: "držení", minutes: 2 });
    const pre = parseNhlLandingExtras(fx("nhl-gc-landing-pregame.json"));
    expect(pre.matchup!.leaders.map((x) => x.category)).toEqual(["points", "goals", "assists"]);
    expect(pre.matchup!.goalies.home[0]).toMatchObject({ name: "J. Swayman", record: "31-18-4" });
    const rr = parseNhlRightRail(fx("nhl-gc-right-rail-pregame.json"));
    expect(rr.teamSeason!.home.gfPerGame).toBeCloseTo(3.27);
  });
});
