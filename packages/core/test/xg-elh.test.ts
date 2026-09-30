import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { expectedGoalElh } from "../src/model/xg.ts";

describe("extraliga xG", () => {
  it("matches the Python training code exactly", () => {
    const ref = JSON.parse(readFileSync(new URL("./fixtures/xg-elh-reference.json", import.meta.url), "utf8")) as {
      xp: number; yp: number; reb: number; pp: number; sh: number; p: number;
    }[];
    for (const r of ref) {
      const p = expectedGoalElh({ xp: r.xp, yp: r.yp, sincePrevSameTeam: r.reb ? 1 : null, strength: r.pp ? "PP" : r.sh ? "SH" : "EV" });
      expect(p).toBeCloseTo(r.p, 10);
    }
  });
  it("rates a slot shot far above a point shot", () => {
    expect(expectedGoalElh({ xp: 82, yp: 0 })).toBeGreaterThan(5 * expectedGoalElh({ xp: 45, yp: 50 }));
  });
});
