import { describe, expect, it } from "vitest";
import { parseHokejczCareer, parseNhlCareer, sameName } from "../src/sources/career.ts";

describe("parseNhlCareer", () => {
  const t = (season: number, leagueAbbrev: string, team: string, gameTypeId: number, gp: number, g: number, a: number) => ({
    season,
    leagueAbbrev,
    teamName: { default: team },
    gameTypeId,
    gamesPlayed: gp,
    goals: g,
    assists: a,
    points: g + a,
  });
  it("sums leagues abroad and leaves Czech leagues and national teams to hokej.cz", () => {
    const lines = parseNhlCareer([
      t(20102011, "Rus-KHL", "Omsk", 2, 51, 31, 30),
      t(20102011, "Rus-KHL", "Omsk", 3, 12, 5, 4),
      t(20112012, "KHL", "Omsk", 2, 54, 23, 16),
      t(20092010, "CzRep", "Slavia", 2, 50, 30, 43),
      t(20132014, "WC-A", "Czechia", 2, 10, 2, 3),
      t(20022003, "Czech U20", "HC Slavia Praha U20", 2, 48, 19, 13),
    ]);
    expect(lines).toEqual([{ label: "KHL", group: "senior", gp: 117, g: 59, a: 50, pts: 109, detail: "2 sezóny", source: "nhl" }]);
  });
});

describe("parseHokejczCareer", () => {
  it("reads the per-competition summary and the senior national team by season", () => {
    const html = `<table>
      <tr><th></th><th>soutěž</th><th>klub</th><th>z</th><th>g</th><th>a</th><th>b</th><th></th></tr>
      <tr><th>2015-2016</th><td>Maxa liga</td><td>Kladno</td><td>4</td><td>0</td><td>1</td><td>1</td><td></td></tr>
      <tr><td>Maxa liga</td><td>2 kluby</td><td>61</td><td>16</td><td>14</td><td>30</td><td></td></tr>
      <tr><td>Generali Česká Cup</td><td>1 klub</td><td>6</td><td>1</td><td>2</td><td>3</td><td></td></tr>
      <tr><td>KB extraliga juniorů</td><td>1 klub</td><td>46</td><td>30</td><td>26</td><td>56</td><td></td></tr>
    </table><table>
      <tr><th></th><th>soutěž</th><th>klub</th><th>z</th><th>g</th><th>a</th><th>b</th><th></th></tr>
      <tr><th>2024-2025</th><td>Reprezentace A</td><td>Česko</td><td>5</td><td>2</td><td>1</td><td>3</td><td></td></tr>
      <tr><td>Reprezentace – příprava</td><td>Česko</td><td>5</td><td>2</td><td>1</td><td>3</td><td></td></tr>
      <tr><th>2025-2026</th><td>Reprezentace A</td><td>Česko</td><td>2</td><td>0</td><td>0</td><td>0</td><td></td></tr>
    </table>`;
    expect(parseHokejczCareer(html).map((l) => [l.label, l.group, l.gp, l.pts])).toEqual([
      ["Maxa liga", "senior", 61, 30],
      ["KB extraliga juniorů", "youth", 46, 56],
      ["Reprezentace A", "national", 7, 3],
    ]);
  });
});

describe("sameName", () => {
  it("ignores diacritics and case", () => expect(sameName("Roman Červenka", "Roman Cervenka")).toBe(true));
});
