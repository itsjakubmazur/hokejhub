import { getGameDetail } from "@/lib/server/game";

export async function GET(request: Request, ctx: RouteContext<"/api/game/[id]">) {
  const { id } = await ctx.params;
  const date = new URL(request.url).searchParams.get("d") ?? undefined;
  const data = await getGameDetail(id, date);
  if (!data) return Response.json({ error: "not found" }, { status: 404 });
  const live = data.game.status === "live" || data.game.status === "intermission";
  const maxAge = live ? 15 : data.game.status === "final" ? 600 : 60;
  return Response.json(data, {
    headers: { "cache-control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 3}` },
  });
}
