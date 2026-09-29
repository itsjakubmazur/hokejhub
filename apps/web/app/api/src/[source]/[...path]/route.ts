/**
 * Read-only CORS proxy for sources that do not send CORS headers. Only allow-listed
 * hosts and path prefixes are forwarded; responses are cached at the edge.
 */
const SOURCES: Record<string, { base: string; allow: RegExp; maxAge: number; accept?: string }> = {
  // Server-rendered HTML; hokej.cz sends no CORS headers. Cached hard to stay polite.
  hokejcz: {
    base: "https://www.hokej.cz/",
    allow: /^(zapas\/\d+|tipsport-extraliga\/(table|zapasy|player-stats)|historie|hrac\/[^/]+\/\d+|klub\/[^/]+\/\d+)(\/|$)|^(redesign\/src\/js|webtemp|public\/js|stats-visualization(\/[\w-]+)*)\/[\w.-]+\.(js|html|json)$/,
    maxAge: 300,
    accept: "text/html",
  },
  nhl: {
    base: "https://api-web.nhle.com/v1/",
    allow: /^(score|scoreboard|schedule|gamecenter|standings|roster|player|club-schedule-season|club-stats|edge)\//,
    maxAge: 15,
  },
  "nhl-stats": {
    base: "https://api.nhle.com/stats/rest/en/",
    allow: /^(team|skater|goalie)\//,
    maxAge: 3600,
  },
};

export async function GET(request: Request, ctx: RouteContext<"/api/src/[source]/[...path]">) {
  const { source, path } = await ctx.params;
  const cfg = SOURCES[source];
  const joined = path.join("/");
  if (!cfg || !cfg.allow.test(joined) || joined.includes("..")) {
    return Response.json({ error: "not allowed" }, { status: 403 });
  }
  const upstream = new URL(joined, cfg.base);
  upstream.search = new URL(request.url).search;
  const res = await fetch(upstream, {
    headers: { accept: cfg.accept ?? "application/json", "user-agent": "HokejHub/0.1 (personal, non-commercial)" },
    next: { revalidate: cfg.maxAge },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!res) return Response.json({ error: "upstream unavailable" }, { status: 502 });
  return new Response(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
      "cache-control": `public, s-maxage=${cfg.maxAge}, stale-while-revalidate=${cfg.maxAge * 4}`,
      "access-control-allow-origin": "*",
    },
  });
}
