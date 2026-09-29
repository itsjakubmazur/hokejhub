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
