import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { jobPath, processJob } from "../src/ingest/hokejcz-crawler.ts";

const fx = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("hokej.cz crawler", () => {
  it("season page → competitions, schedule jobs and table job", () => {
    const r = processJob({ kind: "season", params: { season: 1995 } }, fx("hokejcz-zapasy-1995.html"));
    expect(r.rows.competition.map((c) => c.phase)).toEqual(["playoff", "regular", "relegation"]);
    expect(r.jobs.map((j) => j.key)).toEqual([
      "hcz:schedule:1995:4271",
      "hcz:schedule:1995:4191",
      "hcz:schedule:1995:4281",
      "hcz:table:1995",
    ]);
    expect(jobPath(r.jobs[1]!)).toContain("matchList-view-round-round=1");
    expect(jobPath(r.jobs[0]!)).not.toContain("round");
  });

  it("regular schedule round 1 → remaining rounds + match jobs", () => {
    const r = processJob(
      { kind: "schedule", params: { season: 2024, competition: 7230, phase: "regular" } },
      fx("hokejcz-schedule-round.html"),
    );
    expect(r.jobs.filter((j) => j.kind === "round").length).toBe(51);
    expect(r.jobs.filter((j) => j.kind === "match").length).toBe(7);
  });

  it("match page → game, teams, players, events and box score rows", () => {
    const r = processJob(
      { kind: "match", params: { id: 2928291, season: 2026, competition: 7562, phase: "regular" } },
      fx("hokejcz-match.html"),
    );
    const g = r.rows.game[0]!;
    expect(g).toMatchObject({
      id: "hcz-2928291",
      home_team_id: "hcz-11",
      away_team_id: "hcz-828",
      home_score: 6,
      away_score: 4,
      status: "final",
      decided_in: "REG",
      start_at: "2026-09-29T15:00:00.000Z",
      season_id: "cz-elh-2026",
      attendance: 4620,
    });
    expect(r.rows.game_event.filter((e) => e.type === "goal").length).toBe(10);
    const kubiesa = r.rows.game_event.find((e) => e.type === "goal" && e.period === 2)!;
    expect(kubiesa.period_seconds).toBe(26 * 60 + 16 - 1200);
    expect(r.rows.box_skater.length).toBe(39);
    expect(r.rows.box_goalie.length).toBe(4);
    expect(r.rows.player.find((p) => p.id === "hcz-11411")).toMatchObject({ name: "David Musil", position: "D" });
    expect(r.jobs.filter((j) => j.kind === "player").length).toBe(r.rows.player.length);
    // every referenced player exists
    const ids = new Set(r.rows.player.map((p) => p.id));
    expect(r.rows.box_skater.every((b) => ids.has(b.player_id as string))).toBe(true);
    expect(r.rows.game_event.every((e) => (e.player_ids as string[]).every((p) => ids.has(p)))).toBe(true);
  });

  it("old match page works", () => {
    const r = processJob({ kind: "match", params: { id: 233641, season: 1995, phase: "playoff" } }, fx("hokejcz-match-1996.html"));
    expect(r.rows.game[0]).toMatchObject({ decided_in: "SO", series: "4:2", round: "Semifinále" });
  });

  it("table page → standings rows", () => {
    const r = processJob({ kind: "table", params: { season: 2024 } }, fx("hokejcz-table.html"));
    expect(r.rows.standing_final.length).toBe(42);
  });
});

describe("hokej.cz shots + xG", () => {
  it("stores shots with coordinates, strength and xG", () => {
    const shots = JSON.parse(fx("hokejcz-shots.json"));
    const r = processJob(
      { kind: "match", params: { id: 2928291, season: 2026, competition: 7562, phase: "regular" } },
      fx("hokejcz-match.html"),
      shots,
    );
    const ev = r.rows.game_event.filter((e) => e.type === "shot");
    expect(ev.length).toBe(114);
    expect(ev.filter((e) => (e.payload as { result: string }).result === "goal").length).toBe(10);
    // shooters attack +x after normalisation
    const unblocked = ev.filter((e) => (e.payload as { result: string }).result !== "blocked");
    expect(unblocked.filter((e) => (e.x as number) > 0).length / unblocked.length).toBeGreaterThan(0.9);
    const [hx, ax] = (r.rows.game[0]!.team_stats as { xG: [number, number] }).xG;
    expect(hx).toBeGreaterThan(1);
    expect(ax).toBeGreaterThan(1);
    expect(ev.some((e) => e.situation === "PP")).toBe(true);
    const ids = new Set(r.rows.player.map((p) => p.id));
    expect(ev.every((e) => (e.player_ids as string[]).every((p) => ids.has(p)))).toBe(true);
  });
});

describe("player profile job", () => {
  it("stores photo and bio", () => {
    const r = processJob({ kind: "player", params: { id: 14636 } }, fx("hokejcz-player.html"));
    expect(r.rows.player[0]).toMatchObject({ id: "hcz-14636", headshot: expect.stringContaining("pyrochta"), height_cm: 189, position: "D", current_team_id: "hcz-11" });
  });
});
