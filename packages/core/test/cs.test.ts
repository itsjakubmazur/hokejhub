import { describe, expect, it } from "vitest";
import { CS, csCount, csPlural } from "../src/domain/cs.ts";

describe("csPlural", () => {
  it("declines after numbers", () => {
    expect(csCount(1, CS.zapas)).toBe("1 zápas");
    expect(csCount(4, CS.zapas)).toBe("4 zápasy");
    expect(csCount(5, CS.zapas)).toBe("5 zápasů");
    expect(csCount(0, CS.gol)).toBe("0 gólů");
    expect(csCount(22, CS.bod)).toBe("22 bodů");
    expect(csPlural(-2, CS.gol)).toBe("góly");
    expect(csCount(1.5, CS.gol, (n) => n.toFixed(1).replace(".", ","))).toBe("1,5 gólu");
  });
});
