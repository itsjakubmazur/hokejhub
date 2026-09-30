import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { czechResults, MODERN_WC, modernTournaments, parseHokejczNationalGames } from "../src/sources/hokejcz-national-modern.ts";

describe("hokej.cz national match list", () => {
  const matches = parseHokejczNationalGames(readFileSync(new URL("./fixtures/hokejcz-national-games-2000.html", import.meta.url), "utf8"));

  it("parses rows with teams, score, date and periods", () => {
    expect(matches.length).toBeGreaterThan(40);
    const cf = matches.find((m) => m.id === 3741)!;
    expect(cf).toMatchObject({ home: "Kanada", away: "Finsko", homeScore: 1, awayScore: 2, day: 14, month: 5, periods: "(1:0, 0:1, 0:1)" });
  });

  it("lists our tournament games in our perspective, friendlies before the window left out", () => {
    const wc = MODERN_WC.find((w) => w.year === 2000)!;
    const line = czechResults(matches, wc)!;
    // The 16 April friendly against Canada (also 2:1) stays out; the group game on 3 May is in.
    expect(line.startsWith("Norsko 4:0")).toBe(true);
    expect(line.split("Kanada 2:1").length - 1).toBe(1);
    expect(line.split(", ").length).toBeGreaterThanOrEqual(6);
  });

  it("curated list covers every year from 2000 with a place", () => {
    const years = modernTournaments().map((t) => t.year);
    expect(years[0]).toBe(2000);
    expect(new Set(years).size).toBe(years.length);
    expect(MODERN_WC.filter((w) => w.ourPlace === 1).map((w) => w.year)).toEqual([2000, 2001, 2005, 2010, 2024]);
  });
});

describe("hokej.cz play-off match list (2024)", () => {
  const matches = parseHokejczNationalGames(readFileSync(new URL("./fixtures/hokejcz-national-games-2024-playoff.html", import.meta.url), "utf8"));

  it("takes the stage from the heading above each row, ignoring site chrome", () => {
    expect(matches.map((m) => m.stage)).toEqual(["Čtvrtfinále", "Čtvrtfinále", "Čtvrtfinále", "Čtvrtfinále", "Semifinále", "Semifinále", "O 3. místo", "Finále"]);
  });

  it("writes our play-off run with the rounds", () => {
    const wc = MODERN_WC.find((w) => w.year === 2024)!;
    expect(czechResults(matches, wc)).toBe("USA 1:0 (čtvrtfinále), Švédsko 7:3 (semifinále), Švýcarsko 2:0 (finále)");
  });

  it("every tournament from 2017 has its three hokej.cz competitions", () => {
    for (const w of MODERN_WC.filter((w) => w.year >= 2017 && !w.cancelled)) expect(w.competitionIds, String(w.year)).toHaveLength(3);
    expect(MODERN_WC.find((w) => w.year === 2026)).toMatchObject({ ourPlace: 5, podium: ["Finsko", "Švýcarsko", "Norsko"] });
  });
});
