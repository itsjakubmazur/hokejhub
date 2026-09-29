import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { clockAnchor, parseHokejczOnline } from "../src/sources/hokejcz-online.ts";

const full = JSON.parse(readFileSync(new URL("./fixtures/hokejcz-online-full.json", import.meta.url), "utf8"));

describe("hokej.cz online commentary", () => {
  const c = parseHokejczOnline(full);
  it("parses comments newest first with kinds and times", () => {
    expect(c.length).toBe(134);
    expect(c[0]!.writtenAt >= c.at(-1)!.writtenAt).toBe(true);
    expect(c.filter((x) => x.kind === "goal").length).toBe(10);
    const en = c.find((x) => x.emptyNet)!;
    expect(en).toMatchObject({ time: "58:45", gameSeconds: 3525, teamCode: "TRI" });
    expect(en.players[0]).toBe("Voženílek");
    expect(c.every((x) => !/<(?!\/?(b|i|br)>)/i.test(x.html))).toBe(true);
  });
  it("anchors a stopped clock after the final horn", () => {
    const a = clockAnchor(c)!;
    expect(a.running).toBe(false);
  });
  it("converts Prague written time to UTC", () => {
    const end = c.find((x) => x.kind === "period-end")!;
    expect(end.writtenAt).toBe("2026-09-29T17:28:56.000Z");
  });
});
