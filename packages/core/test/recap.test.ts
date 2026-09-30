import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseHokejczMatch } from "../src/sources/hokejcz.ts";
import { matchRecap } from "../src/model/recap.ts";

describe("matchRecap", () => {
  it("writes a Czech report from a box score", () => {
    const box = parseHokejczMatch(readFileSync(new URL("./fixtures/hokejcz-match.html", import.meta.url), "utf8"), 1);
    const lines = matchRecap(box, { xg: [2.4, 1.1], homeWinProb: 0.5 });
    console.log(lines.join("\n"));
    expect(lines[0]).toMatch(/vyhrává|smírně/);
    expect(lines.some((l) => l.startsWith("Skóre otevřel"))).toBe(true);
  });
  it("handles the 1996 archive page", () => {
    const box = parseHokejczMatch(readFileSync(new URL("./fixtures/hokejcz-match-1996.html", import.meta.url), "utf8"), 2);
    const lines = matchRecap(box);
    console.log(lines.join("\n"));
    expect(lines.length).toBeGreaterThan(1);
  });
});
