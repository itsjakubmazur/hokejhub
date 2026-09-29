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

import {
  parseHokejczSchedule,
  parseHokejczStandings,
  parsePeriodString,
} from "../src/sources/hokejcz.ts";

const fx = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("hokej.cz periods", () => {
  it("handles regulation, OT and shootout", () => {
    expect(parsePeriodString("1:3, 2:0, 3:1")).toEqual({ periods: [[1, 3], [2, 0], [3, 1]], decidedIn: "REG" });
    expect(parsePeriodString("(0:1, 3:1, 0:1 - 1:0)").decidedIn).toBe("OT");
    const so = parsePeriodString("(1:1, 2:2, 1:1 - 0:0 - 1:0)");
    expect(so).toEqual({ periods: [[1, 1], [2, 2], [1, 1], [0, 0]], decidedIn: "SO" });
  });
});

describe("hokej.cz 1996 match", () => {
  const m = parseHokejczMatch(fx("hokejcz-match-1996.html"), 233641);
  it("parses an old playoff game", () => {
    expect(m).toMatchObject({ homeScore: 5, awayScore: 4, decidedIn: "SO", series: "4:2", round: "Semifinále" });
    expect(m.periods.length).toBe(4);
    expect(m.goals.length).toBeGreaterThan(5);
    expect(m.skaters.home.length).toBeGreaterThan(10);
  });
});

describe("hokej.cz schedule", () => {
  it("parses a regular-season round with competitions and rounds", () => {
    const p = parseHokejczSchedule(fx("hokejcz-schedule-round.html"), 2024);
    expect(p.seasons).toContain(1991);
    expect(p.competitions.map((c) => [c.id, c.phase])).toEqual([
      [7374, "playoff"],
      [7230, "regular"],
      [7375, "relegation"],
    ]);
    expect(p.rounds.length).toBe(52);
    expect(p.matches.length).toBe(7);
    expect(p.matches[0]).toMatchObject({
      id: 2915099,
      home: { abbrev: "SPA" },
      away: { abbrev: "TRI" },
      homeScore: 3,
      awayScore: 0,
      date: "2024-09-17",
      decidedIn: "REG",
    });
  });

  it("parses a whole playoff with stages, series and OT/SO markers", () => {
    const p = parseHokejczSchedule(fx("hokejcz-playoff.html"), 2024);
    expect(p.matches.length).toBeGreaterThan(50);
    const first = p.matches[0]!;
    expect(first.stage).toBe("Předkolo");
    expect(first.seriesLabel).toMatch(/^Série .*: 3:2$/);
    expect(first.decidedIn).toBe("OT");
    expect(first.date).toBe("2025-03-07");
    expect(p.matches.some((m) => m.decidedIn === "SO")).toBe(true);
  });

  it("picks the default competition for an old season", () => {
    const p = parseHokejczSchedule(fx("hokejcz-zapasy-1995.html"), 1995);
    expect(p.competitions.map((c) => c.id)).toEqual([4271, 4191, 4281]);
    expect(p.matches.length).toBeGreaterThan(40);
  });
});

describe("hokej.cz standings", () => {
  it("parses overall, home and away tables", () => {
    const t = parseHokejczStandings(fx("hokejcz-table.html"));
    expect(t.overall.length).toBe(14);
    expect(t.overall[0]).toMatchObject({ rank: 1, team: "HC Sparta Praha", gp: 52, w: 29, gf: 177, ga: 110, pts: 104 });
    expect(t.home[0]!.gf).toBe(104);
    expect(t.away[0]!.gf).toBe(73);
  });
});

import { parseHokejczPlayer } from "../src/sources/hokejcz.ts";

describe("hokej.cz player profile", () => {
  it("parses photo and bio", () => {
    const p = parseHokejczPlayer(fx("hokejcz-player.html"), 14636);
    expect(p).toMatchObject({
      name: "Filip Pyrochta",
      photoUrl: "https://www.hokej.cz/static/images/hrac/py/pyrochta-filip-tri-24-standard.png",
      birthDate: "1996-06-24",
      heightCm: 189,
      weightKg: 87,
      position: "D",
      shoots: "L",
      clubId: 11,
    });
  });
});
