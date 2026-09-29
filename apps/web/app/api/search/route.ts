import { dbAvailable } from "@/lib/server/db";
import { search } from "@/lib/server/hub";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!dbAvailable() || q.length < 2) return Response.json({ hits: [] });
  const hits = await search(q);
  return Response.json({ hits }, { headers: { "cache-control": "public, s-maxage=300" } });
}
