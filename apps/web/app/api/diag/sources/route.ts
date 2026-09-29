/**
 * Reachability check of upstream sources from wherever this server runs (e.g. Vercel),
 * to find out which sources block datacenter IPs. Returns HTTP status per source.
 */
const TARGETS: Record<string, string> = {
  hokejcz_home: "https://www.hokej.cz/",
  hokejcz_robots: "https://www.hokej.cz/robots.txt",
  hokejcz_match: "https://www.hokej.cz/zapas/2928291/",
  esports_scoreboard: "https://json.esports.cz/hokejcz/scoreboard/onlajny/2026-09-29.json",
  nhl_score: "https://api-web.nhle.com/v1/score/2026-09-29",
};

export const dynamic = "force-dynamic";

export async function GET() {
  const results = await Promise.all(
    Object.entries(TARGETS).map(async ([name, url]) => {
      const started = Date.now();
      try {
        const res = await fetch(url, {
          cache: "no-store",
          headers: { "user-agent": "HokejHub/0.1 (personal, non-commercial)" },
          signal: AbortSignal.timeout(8000),
        });
        const body = await res.text();
        return { name, status: res.status, bytes: body.length, ms: Date.now() - started };
      } catch (e) {
        return { name, status: 0, error: e instanceof Error ? e.message : String(e), ms: Date.now() - started };
      }
    }),
  );
  return Response.json({ region: process.env.VERCEL_REGION ?? "local", results });
}
