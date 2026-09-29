import { describe, expect, it } from "vitest";
import live from "./fixtures/scoreboard-live.json";
import final from "./fixtures/scoreboard-final.json";
import liveOdds from "./fixtures/live-odds.json";
import ticket from "./fixtures/ticket-analysis.json";
import {
  mapEsportsStatus,
  parseLiveOdds,
  parseScoreboard,
  parseTicketAnalysis,
} from "../src/sources/esports.ts";
import { pragueToUtcIso } from "../src/domain/time.ts";

describe("eSports scoreboard", () => {
  it("parses a live day across leagues", () => {
    const games = parseScoreboard(live);
    const elh = games.filter((g) => g.leagueKey === "cz-elh");
    expect(elh.length).toBe(6);
    const trinec = elh.find((g) => g.external.onlajnyId === 532950)!;
    expect(trinec).toMatchObject({
      id: "cz-532950",
      status: "intermission",
      period: 2,
      homeScore: 3,
      awayScore: 3,
      periods: [
        [1, 3],
        [2, 0],
        [0, 0],
      ],
      startAt: "2026-09-29T15:00:00.000Z",
    });
    expect(trinec.home.abbrev).toBe("TRI");
    expect(trinec.preOdds?.home).toBeGreaterThan(1);
    expect(games.some((g) => g.leagueKey === "nhl")).toBe(true);
  });

  it("marks scheduled games without score", () => {
    const g = parseScoreboard(live).find((x) => x.leagueKey === "cz-maxa")!;
    expect(g.status).toBe("scheduled");
    expect(g.homeScore).toBeNull();
    expect(g.periods).toEqual([]);
  });

  it("parses finished games with decision", () => {
    const games = parseScoreboard(final);
    expect(games.length).toBeGreaterThan(0);
    for (const g of games) {
      if (g.status === "final") expect(g.decidedIn).toMatch(/REG|OT|SO/);
    }
  });

  it("maps statuses", () => {
    expect(mapEsportsStatus("live", "1P")).toEqual({ status: "intermission", period: 1, decidedIn: null });
    expect(mapEsportsStatus("live", "3").period).toBe(3);
    expect(mapEsportsStatus("po zápase", "KN").decidedIn).toBe("SO");
    expect(mapEsportsStatus("po zápase", "KP").decidedIn).toBe("OT");
    expect(mapEsportsStatus("zrušeno", "XO").status).toBe("postponed");
    expect(mapEsportsStatus("zrušeno", "XZ").status).toBe("cancelled");
  });
});

describe("odds", () => {
  it("parses live odds keyed by onlajny id", () => {
    const m = parseLiveOdds(liveOdds);
    expect(m.size).toBeGreaterThan(0);
    const first = [...m.values()][0]!;
    expect(first.home).toBeGreaterThan(1);
  });

  it("parses ticket analysis", () => {
    const t = parseTicketAnalysis(ticket);
    expect(t.home.pct + t.draw.pct + t.away.pct).toBeGreaterThan(95);
    expect(t.topBets.length).toBeGreaterThan(0);
  });

  it("tolerates missing sides in ticket analysis", () => {
    const t = parseTicketAnalysis({ rozlozeni_vkladu: { remiza: { procenta: 16 } }, nejsazenejsi_tipy: [] });
    expect(t.draw.pct).toBe(16);
    expect(t.home.pct).toBe(0);
  });
});

describe("time", () => {
  it("converts Prague wall time across DST", () => {
    expect(pragueToUtcIso("2026-01-15", "18:00")).toBe("2026-01-15T17:00:00.000Z");
    expect(pragueToUtcIso("2026-07-15", "18:00")).toBe("2026-07-15T16:00:00.000Z");
  });
});

import alt from "./fixtures/scoreboard-alt.json";
import { parseScoreboardAlt } from "../src/sources/esports.ts";

describe("eSports scoreboard (alt variant)", () => {
  it("parses ELH with name-based league mapping and DD-MM-YYYY dates", () => {
    const games = parseScoreboardAlt(alt);
    expect(games.length).toBe(6);
    expect(games.every((g) => g.leagueKey === "cz-elh")).toBe(true);
    expect(games[0]).toMatchObject({ id: "cz-532950", startAt: "2026-09-29T15:00:00.000Z" });
    expect(games[0]!.periods.length).toBe(3);
  });
});
