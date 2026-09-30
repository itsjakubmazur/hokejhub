import { czechResults, MODERN_WC, parseHokejczNationalGames } from "@hokejhub/core";

/**
 * GET /api/admin/national-debug?year=2024 — what this deployment gets from hokej.cz for a
 * championship's match lists (fresh fetch, bypassing the data cache) and what it parses out.
 */
export const dynamic = "force-dynamic";

const ORIGIN = process.env.HOKEJCZ_ORIGIN ?? "https://www.hokej.cz/";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const year = Number(new URL(req.url).searchParams.get("year") ?? "2026");
  const wc = MODERN_WC.find((w) => w.year === year);
  if (!wc) return Response.json({ error: "unknown year" }, { status: 404 });
  const parsed: ReturnType<typeof parseHokejczNationalGames> = [];
  const pages = await Promise.all(
    wc.competitionIds.map(async (id) => {
      const res = await fetch(new URL(`reprezentace/zapasy/15?competitionId=${id}`, ORIGIN), {
        headers: { "user-agent": "HokejHub/0.1 (personal, non-commercial)", accept: "text/html" },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      }).catch((e: Error) => e);
      if (res instanceof Error) return { id, error: res.message };
      const html = res.ok ? await res.text() : "";
      const games = parseHokejczNationalGames(html);
      parsed.push(...games);
      return {
        id,
        status: res.status,
        bytes: html.length,
        rows: (html.match(/data-href="\/zapas\//g) ?? []).length,
        headings: [...html.matchAll(/<h2[^>]*>([^<]{1,40})<\/h2>/g)].map((m) => m[1]).slice(0, 12),
        games: games.length,
        ours: games.filter((g) => /^Česk/.test(g.home) || /^Česk/.test(g.away)).map((g) => `${g.date} ${g.home} ${g.homeScore}:${g.awayScore} ${g.away} [${g.stage}]`),
      };
    }),
  );
  return Response.json({ year, competitionIds: wc.competitionIds, pages, results: czechResults(parsed, wc) });
}
