import { getLiveElhGames } from "@/lib/server/live-table";

export async function GET() {
  const games = await getLiveElhGames();
  return Response.json(games, { headers: { "cache-control": "public, s-maxage=20, stale-while-revalidate=40" } });
}
