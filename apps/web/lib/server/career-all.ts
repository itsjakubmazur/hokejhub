import { unstable_cache } from "next/cache";
import { parseHokejczCareer, parseNhlCareer, sameName, type CareerLine } from "@hokejhub/core";
import { sql } from "./db";

const ORIGIN = process.env.HOKEJCZ_ORIGIN ?? "https://www.hokej.cz/";
const USER_AGENT = "HokejHub/0.1 (personal, non-commercial)";

async function get(url: string, accept: string) {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept },
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  return res?.ok ? res : null;
}

/** The NHL id of a player with an NHL profile: same birth date, same name. */
async function nhlId(name: string, birthDate: string): Promise<number | null> {
  for (const kind of ["skater", "goalie"] as const) {
    const res = await get(
      `https://api.nhle.com/stats/rest/en/${kind}/bios?isAggregate=true&isGame=false&limit=50&cayenneExp=` +
        encodeURIComponent(`birthDate="${birthDate}" and gameTypeId=2`),
      "application/json",
    );
    const data = ((await res?.json().catch(() => null)) as { data?: Record<string, unknown>[] } | null)?.data ?? [];
    const hit = data.find((r) => sameName(String(r.skaterFullName ?? r.goalieFullName ?? ""), name));
    if (hit) return Number(hit.playerId);
  }
  return null;
}

export interface CareerAll {
  lines: CareerLine[];
  nhlId: number | null;
  /** Whether hokej.cz answered (its part is missing otherwise). */
  hokejcz: boolean;
}

async function load(playerId: string): Promise<CareerAll> {
  const [p] = await sql<{ name: string; birth_date: string | null }>(
    "select name, to_char(birth_date, 'YYYY-MM-DD') as birth_date from player where id = $1",
    [playerId],
  );
  if (!p) return { lines: [], nhlId: null, hokejcz: false };
  const hcz = /^hcz-(\d+)$/.exec(playerId)?.[1];

  const [elh, page, nhl] = await Promise.all([
    sql<{ gp: number; g: number; a: number; pts: number; seasons: number }>(
      `select coalesce(sum(gp), 0)::int as gp, coalesce(sum(g), 0)::int as g, coalesce(sum(a), 0)::int as a,
              coalesce(sum(pts), 0)::int as pts, count(distinct season)::int as seasons
       from skater_season where player_id = $1 and league_id = 'cz-elh'`,
      [playerId],
    ),
    hcz ? get(new URL(`hrac/x/${hcz}/career`, ORIGIN).toString(), "text/html").then((r) => r?.text() ?? null) : Promise.resolve(null),
    p.birth_date ? nhlId(p.name, p.birth_date) : Promise.resolve(null),
  ]);

  const lines: CareerLine[] = [];
  const e = elh[0];
  if (e && e.gp > 0) {
    lines.push({
      label: "Tipsport extraliga",
      group: "senior",
      gp: e.gp,
      g: e.g,
      a: e.a,
      pts: e.pts,
      detail: `${e.seasons} ${e.seasons === 1 ? "sezóna" : e.seasons < 5 ? "sezóny" : "sezón"}`,
      source: "db",
    });
  }
  let fromHcz = page ? parseHokejczCareer(page) : [];
  if (nhl) {
    const landing = await get(`https://api-web.nhle.com/v1/player/${nhl}/landing`, "application/json");
    const totals = ((await landing?.json().catch(() => null)) as { seasonTotals?: Parameters<typeof parseNhlCareer>[0] } | null)?.seasonTotals;
    if (totals) {
      const abroad = parseNhlCareer(totals);
      // the NHL's own numbers win over hokej.cz's copy of them
      const labels = new Set(abroad.map((l) => l.label));
      fromHcz = fromHcz.filter((l) => !labels.has(l.label));
      lines.push(...abroad);
    }
  }
  lines.push(...fromHcz);
  const order = { senior: 0, national: 1, youth: 2, "national-youth": 3 } as const;
  lines.sort((x, y) => order[x.group] - order[y.group] || y.gp - x.gp);
  return { lines, nhlId: nhl, hokejcz: page != null };
}

export const getCareerAll = unstable_cache(load, ["career-all-v1"], { revalidate: 86400 });
