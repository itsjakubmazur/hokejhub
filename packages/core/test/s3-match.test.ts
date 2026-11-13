import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { processJob } from "../src/ingest/hokejcz-crawler.ts";
import { processS3Match, type KnownPlayer } from "../src/ingest/s3-match.ts";

const fx = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const json = (name: string) => JSON.parse(fx(name));

// Plzeň – Třinec 4:2, 30. 10. 2026: the match page and the S3 files of the same game.
const page = processJob({ kind: "match", params: { id: 2928362, season: 2026 } }, fx("hokejcz-match-2928362.html"), json("hokejcz-shots-2928362.json")).rows;
const input = {
  gameId: "hcz-2928362",
  homeTeamId: "hcz-917",
  awayTeamId: "hcz-11",
  decidedIn: "REG",
  playerStats: json("onlajny-player-stats-533020.json"),
  summary: json("onlajny-summary-533020.json"),
  roster: json("onlajny-roster-533020.json"),
  shots: json("hokejcz-shots-2928362.json"),
  online: json("hokejcz-online-2928362.json"),
};
/** What the database knows of these teams: the players of this game, from the match page. */
const known: KnownPlayer[] = [...page.box_skater, ...page.box_goalie].map((b) => ({
  id: String(b.player_id),
  teamId: String(b.team_id),
  number: b.number as number,
  name: String(page.player.find((p) => p.id === b.player_id)?.name),
}));
const byJersey = (rows: Record<string, unknown>[]) => new Map(rows.map((r) => [`${r.team_id}#${r.number}`, r]));

describe("box score from the S3 files", () => {
  it("skater lines match the match page", () => {
    const r = processS3Match({ ...input, known });
    expect(r.unresolved).toEqual([]);
    const s3 = byJersey(r.rows.box_skater);
    expect(s3.size).toBe(page.box_skater.length);
    for (const want of page.box_skater) {
      const got = s3.get(`${want.team_id}#${want.number}`)!;
      for (const k of ["player_id", "position", "toi_s", "g", "a", "pts", "pim", "pm", "hits", "sog", "blk", "fo_w", "fo_taken", "ri"])
        expect([want.number, k, got[k]]).toEqual([want.number, k, want[k]]);
    }
  });

  it("goalies, team statistics, referees and shots match the match page", () => {
    const r = processS3Match({ ...input, known });
    const g = byJersey(r.rows.box_goalie);
    for (const want of page.box_goalie) {
      expect(g.get(`${want.team_id}#${want.number}`)).toMatchObject({ player_id: want.player_id, saves: want.saves, ga: want.ga, sv_pct: want.sv_pct });
    }
    // Only one goalie per team played: the whole game (the match page knows Mazanec sat 85 s out).
    expect(g.get("hcz-11#2")!.toi_s).toBe(3600);
    expect(g.get("hcz-11#1")!.toi_s).toBeNull();
    expect(r.game.team_stats).toEqual(page.game[0]!.team_stats);
    expect(r.game.referees).toEqual(page.game[0]!.referees);
    expect(r.rows.game_event.filter((e) => e.type === "shot")).toEqual(page.game_event.filter((e) => e.type === "shot"));
  });

  it("goals and penalties from the commentary", () => {
    const r = processS3Match({ ...input, known });
    const events = (rows: typeof page) => rows.game_event.filter((e) => e.type !== "shot");
    const s3 = events(r.rows);
    const html = events(page);
    expect(s3.map((e) => [e.seq, e.type, e.period, e.team_id])).toEqual(html.map((e) => [e.seq, e.type, e.period, e.team_id]));
    // Scorers are the same; the commentary credits Plzeň's goalie with an assist the match page does not.
    expect(s3.filter((e) => e.type === "goal").map((e) => (e.player_ids as string[])[0])).toEqual(
      html.filter((e) => e.type === "goal").map((e) => (e.player_ids as string[])[0]),
    );
    expect(s3.filter((e) => e.type === "goal").map((e) => e.situation)).toEqual(["5/5", "5/5", "5/5", "5/5", "5/5", "5/5"]);
    // Both Petman brothers on ice, told apart by nothing but being two of them.
    expect([...((s3[4]!.payload as { onIcePlus: string[] }).onIcePlus)].sort()).toEqual(expect.arrayContaining(["hcz-10082886", "hcz-10083154"]));
    // "Merežko" in the commentary, "Merezhko" in the statistics.
    expect((s3[5]!.payload as { onIcePlus: string[] }).onIcePlus).toContain("hcz-10110308");
    expect(s3.filter((e) => e.type === "penalty").map((e) => [(e.player_ids as string[])[0], (e.payload as { reason: string }).reason])).toEqual([
      ["hcz-10097899", "vražení na hrazení"],
      ["hcz-14888", "hrubost"],
      ["hcz-14110", "vysoká hůl"],
      ["hcz-n-hracska-lavice", "příliš mnoho hráčů na ledě (Matěj Kubiesa)"],
      ["hcz-10842", "vysoká hůl"],
    ]);
  });

  it("without the database, players get hokej.cz ids from the summary and the shot feed", () => {
    const r = processS3Match(input);
    const ids = r.rows.box_skater.map((b) => String(b.player_id));
    expect(ids.filter((id) => /^hcz-\d+$/.test(id)).length).toBe(35);
    expect(r.unresolved).toEqual(["Jakub Chromiak", "David Musil", "David Aubrecht", "Miloš Roman", "Denis Čelko"]);
    // Nobody got a wrong id: every numeric one is the match page's.
    const truth = byJersey(page.box_skater);
    for (const b of r.rows.box_skater) if (/^hcz-\d+$/.test(String(b.player_id))) expect(b.player_id).toBe(truth.get(`${b.team_id}#${b.number}`)!.player_id);
  });
});
