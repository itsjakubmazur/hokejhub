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

import { finalScores, likelyScore, matchMarkets, pickTips } from "../src/model/markets.ts";

describe("markets", () => {
  it("final scores sum to one and resolve ties", () => {
    const f = finalScores(3.1, 2.4);
    expect(f.reduce((s, c) => s + c.p, 0)).toBeCloseTo(1, 6);
    expect(f.every((c) => c.h !== c.a)).toBe(true);
    expect(f[0]!.p).toBeGreaterThan(f[1]!.p);
  });
  it("likely score varies with the gap", () => {
    expect(likelyScore(2.7, 2.6)).toEqual({ home: 3, away: 2 });
    expect(likelyScore(3.9, 1.8)).toEqual({ home: 3, away: 1 });
    expect(likelyScore(2.2, 2.0)).toEqual({ home: 2, away: 1 });
    expect(likelyScore(2.85, 2.85)).toEqual({ home: 3, away: 2 });
  });
  it("markets are consistent", () => {
    const m = matchMarkets(3.2, 2.3, "Sparta", "Motor");
    const get = (k: string) => m.find((x) => x.key === k)!.p;
    expect(get("1") + get("X") + get("2")).toBeCloseTo(1, 6);
    expect(get("1-ot") + get("2-ot")).toBeCloseTo(1, 6);
    expect(get("h-1.5") + get("a+1.5")).toBeCloseTo(1, 6);
    expect(get("o5.5") + get("u5.5")).toBeCloseTo(1, 6);
    expect(get("o4.5")).toBeGreaterThan(get("o5.5"));
    expect(get("fg-h")).toBeGreaterThan(get("fg-a"));
    const tips = pickTips(m);
    expect(tips.length).toBeGreaterThan(0);
    expect(new Set(tips.map((t) => t.group)).size).toBe(tips.length);
  });
});
