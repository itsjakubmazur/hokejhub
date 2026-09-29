import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseHokejczMatch } from "../src/sources/hokejcz.ts";

const html = readFileSync(new URL("./fixtures/hokejcz-match.html", import.meta.url), "utf8");

describe("hokej.cz match page", () => {
  const m = parseHokejczMatch(html, 2928291);

  it("parses header", () => {
    expect(m).toMatchObject({
      competition: "Tipsport extraliga",
      startLocal: "29.9.2026 17:00",
      round: "6. kolo",
      homeScore: 6,
      awayScore: 4,
      statusLabel: "konec",
      periods: [
        [1, 3],
        [2, 0],
        [3, 1],
      ],
      attendance: 4620,
      venue: "Třinec, WERK ARENA",
      capacity: 5400,
    });
    expect(m.home).toMatchObject({ name: "HC Oceláři Třinec", abbrev: "TRI", clubId: 11 });
    expect(m.away).toMatchObject({ shortName: "Kladno", abbrev: "KLA", clubId: 828 });
  });

  it("parses team stats and officials", () => {
    expect(m.teamStats["Střely na branku"]).toEqual([37, 27]);
    expect(m.teamStats["Radegast index"]).toEqual([28, 2]);
    expect(m.shotsByPeriod).toEqual([
      [20, 14],
      [8, 7],
      [9, 6],
    ]);
    expect(m.referees.length + m.linesmen.length).toBeGreaterThan(0);
  });

  it("parses goals with periods, assists and on-ice players", () => {
    expect(m.goals.length).toBe(10);
    const first = m.goals[0]!;
    expect(first).toMatchObject({ period: "1. třetina", time: "06:06", team: "KLA", situation: "5/5" });
    expect(first.scorer).toEqual({ name: "Niko OJAMÄKI", id: 33851 });
    expect(first.scorerSeasonGoals).toBe(3);
    expect(first.assists.map((a) => a.name)).toEqual(["Tomáš TOMEK", "Phil PIETRONIRO"]);
    expect(first.onIcePlus.length).toBe(6);
    expect(first.onIceMinus.length).toBe(6);
    const homeGoals = m.goals.filter((g) => g.team === "TRI").length;
    expect([homeGoals, m.goals.length - homeGoals]).toEqual([6, 4]);
  });

  it("parses penalties", () => {
    expect(m.penalties[0]).toMatchObject({ time: "10:05", team: "KLA", minutes: 5 });
    expect(m.penalties[0]!.player.name).toBe("Niko OJAMÄKI");
  });

  it("parses box score", () => {
    expect(m.skaters.home.length).toBe(20);
    expect(m.skaters.away.length).toBe(19);
    const musil = m.skaters.home[0]!;
    expect(musil).toMatchObject({ number: 6, position: "O", toiSeconds: 1016, shToiSeconds: 26, plusMinus: 1, blocks: 3 });
    const roman = m.skaters.home.find((s) => s.player.name === "Miloš ROMAN")!;
    expect(roman).toMatchObject({ faceoffsWon: 3, faceoffsTaken: 11, assists: 2 });
    expect(m.goalies.home[0]).toMatchObject({ saves: 20, goalsAgainst: 2, savePct: 90.91 });
    const homeG = m.skaters.home.reduce((s, x) => s + x.goals, 0);
    expect(homeG).toBe(6);
  });
});
