import { getGameDetail, type Timings } from "@/lib/server/game";

export async function GET(request: Request, ctx: RouteContext<"/api/game/[id]">) {
  const { id } = await ctx.params;
  const date = new URL(request.url).searchParams.get("d") ?? undefined;
  const t: Timings = {};
  const start = performance.now();
  const data = await getGameDetail(id, date, t);
  t.total = Math.round(performance.now() - start);
  const timing = Object.entries(t).map(([k, v]) => `${k};dur=${v}`).join(", ");
  if (!data) return Response.json({ error: "not found" }, { status: 404 });
  const live = data.game.status === "live" || data.game.status === "intermission";
  const maxAge = live ? 15 : data.game.status === "final" ? 600 : 60;
  return Response.json(data, {
    headers: { "server-timing": timing, "cache-control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 3}` },
  });
}
