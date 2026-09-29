import { expect, it } from "vitest";
import landing from "./fixtures/nhl-landing.json";
import { parseNhlLanding } from "../src/sources/nhl.ts";

it("parses a landing response into a Game", () => {
  const g = parseNhlLanding(landing);
  expect(g).toMatchObject({ id: "nhl-2025020500", status: "final", homeScore: 5, awayScore: 4 });
  expect(g.periods.length).toBeGreaterThanOrEqual(3);
});
