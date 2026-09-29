import { describe, expect, it } from "vitest";
import type { Game } from "../src/domain/types.ts";
import { detectEvents, inQuietHours, rememberOnce, shouldNotify, snapshotOf, DEFAULT_PREFS } from "../src/notify/engine.ts";

const base: Game = {
  id: "cz-1",
  source: "esports",
  leagueKey: "cz-elh",
  leagueName: "Tipsport extraliga",
  startAt: "2026-10-02T16:00:00Z",
  status: "scheduled",
  statusLabel: "",
  period: null,
  clock: null,
  home: { id: "h", name: "HC Sparta Praha", shortName: "Sparta", abbrev: "SPA", logoUrl: null },
  away: { id: "a", name: "HC Motor České Budějovice", shortName: "Motor ČB", abbrev: "CEB", logoUrl: null },
  homeScore: null,
  awayScore: null,
  periods: [],
  decidedIn: null,
  series: null,
  preOdds: null,
  external: {},
};

describe("detectEvents", () => {
  it("emits reminder once, then start, goals, equalizer, lead change, close finish, final", () => {
    const t0 = Date.parse(base.startAt) - 10 * 60000;
    let e = detectEvents(undefined, base, t0);
    expect(e.map((x) => x.kind)).toEqual(["reminder"]);
    let s = rememberOnce(snapshotOf(base), e);
    expect(detectEvents(s, base, t0 + 60000)).toEqual([]);

    const live = { ...base, status: "live" as const, period: 1, clock: "1", homeScore: 0, awayScore: 0 };
    e = detectEvents(s, live);
    expect(e.map((x) => x.kind)).toEqual(["start"]);
    s = rememberOnce(snapshotOf(live, s), e);

    const g1 = { ...live, awayScore: 1, clock: "12" };
    e = detectEvents(s, g1);
    expect(e.map((x) => x.kind)).toEqual(["goal"]);
    expect(e[0]!.title).toContain("Motor");
    s = rememberOnce(snapshotOf(g1, s), e);

    const g2 = { ...g1, homeScore: 1, clock: "30", period: 2 };
    e = detectEvents(s, g2);
    expect(e.map((x) => x.kind)).toEqual(["goal", "equalizer"]);
    s = rememberOnce(snapshotOf(g2, s), e);

    const g3 = { ...g2, homeScore: 2, clock: "56", period: 3 };
    e = detectEvents(s, g3);
    expect(e.map((x) => x.kind)).toEqual(["goal", "close_finish"]);
    s = rememberOnce(snapshotOf(g3, s), e);

    // No repeat of close_finish.
    expect(detectEvents(s, { ...g3, clock: "58" })).toEqual([]);

    const fin = { ...g3, status: "final" as const, periods: [[0, 1], [1, 0], [1, 0]] as [number, number][] };
    expect(detectEvents(s, fin).map((x) => x.kind)).toEqual(["final"]);
  });

  it("lead change when a trailing team goes ahead in one tick", () => {
    const s = snapshotOf({ ...base, status: "live", homeScore: 0, awayScore: 1 });
    const e = detectEvents(s, { ...base, status: "live", homeScore: 2, awayScore: 1 });
    expect(e.map((x) => x.kind)).toEqual(["goal", "lead_change"]);
  });
});

describe("prefs", () => {
  it("matches followed teams by name and respects quiet hours", () => {
    const g = { ...base, status: "live" as const };
    const [e] = detectEvents(snapshotOf(base), g);
    const prefs = { ...DEFAULT_PREFS, teams: ["HC Motor České Budějovice"], quiet: null };
    expect(shouldNotify(prefs, g, e!)).toBe(true);
    expect(shouldNotify({ ...prefs, teams: ["Kometa"] }, g, e!)).toBe(false);
    expect(shouldNotify({ ...prefs, teams: [], leagues: ["cz-elh"] }, g, e!)).toBe(true);
    // 23:30 Prague in October = 21:30 UTC.
    const night = Date.parse("2026-10-02T21:30:00Z");
    expect(inQuietHours({ from: 23, to: 7 }, night)).toBe(true);
    expect(inQuietHours({ from: 23, to: 7 }, Date.parse("2026-10-02T10:00:00Z"))).toBe(false);
  });
});
