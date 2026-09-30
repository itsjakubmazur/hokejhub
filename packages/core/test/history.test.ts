import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseHokejczHistory } from "../src/sources/hokejcz-history.ts";

describe("parseHokejczHistory", () => {
  it("parses a five-season block", () => {
    const seasons = parseHokejczHistory(readFileSync(new URL("./fixtures/hokejcz-history-1966.html", import.meta.url), "utf8"));
    expect(seasons.map((s) => s.season)).toEqual([1966, 1967, 1968, 1969, 1970]);
    const s = seasons[0]!;
    expect(s.label).toBe("1966/1967");
    expect(s.tables[0]!.title).toBe("I. liga");
    expect(s.tables[0]!.rows).toHaveLength(10);
    expect(s.tables[0]!.rows[0]).toMatchObject({ rank: 1, team: "Dukla Jihlava", gp: 36, w: 23, t: 6, l: 7, gf: 173, ga: 81, pts: 52 });
    // "180 123" without a colon
    expect(s.tables[0]!.rows[3]).toMatchObject({ team: "Slovan Bratislava CHZJD", gf: 180, ga: 123, pts: 44 });
    expect(s.champion).toBe("Jihlava");
    expect(s.topScorer).toMatchObject({ name: "Václav Nedomanský", team: "Bratislava", goals: 40 });
  });
});

describe("parseHokejczNational", () => {
  it("parses world championships", async () => {
    const { parseHokejczNational } = await import("../src/sources/hokejcz-history.ts");
    const ts = parseHokejczNational(readFileSync(new URL("./fixtures/hokejcz-national-1971.html", import.meta.url), "utf8"));
    const y1972 = ts.find((t) => t.year === 1972)!;
    expect(y1972).toMatchObject({ number: 39, place: "Praha, ČSSR", ourPlace: 1 });
    expect(y1972.ranking.slice(0, 3)).toEqual(["ČSSR", "SSSR", "Švédsko"]);
    expect(y1972.roster).toContain("Holeček");
    // 1976: the stray "Pořadí" above the heading belongs to 1975, not 1976.
    expect(ts.find((t) => t.year === 1976)!.ourPlace).toBe(1);
    // 1975: the ranking is written above the heading.
    expect(ts.find((t) => t.year === 1975)!.ranking.slice(0, 3)).toEqual(["SSSR", "ČSSR", "Švédsko"]);
  });
});
