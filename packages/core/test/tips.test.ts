import { describe, expect, it } from "vitest";
import { modelTip, tipPoints } from "../src/model/tips.ts";

describe("tips", () => {
  it("scores tips", () => {
    expect(tipPoints({ home: 3, away: 2 }, 3, 2, "REG")).toBe(5);
    expect(tipPoints({ home: 4, away: 3 }, 3, 2, "REG")).toBe(3);
    expect(tipPoints({ home: 5, away: 1 }, 3, 2, "REG")).toBe(2);
    expect(tipPoints({ home: 1, away: 2 }, 3, 2, "REG")).toBe(0);
    // OT win 3:2 → regulation 2:2
    expect(tipPoints({ home: 2, away: 2 }, 3, 2, "OT")).toBe(5);
    expect(tipPoints({ home: 1, away: 1 }, 3, 2, "SO")).toBe(3);
    expect(tipPoints({ home: 3, away: 2 }, 3, 2, "OT")).toBe(0);
  });
  it("model tips favour the stronger side", () => {
    const t = modelTip(3.4, 2.1);
    expect(t.home).toBeGreaterThan(t.away);
    const even = modelTip(2.8, 2.8);
    expect(Math.abs(even.home - even.away)).toBeLessThanOrEqual(1);
  });
});
