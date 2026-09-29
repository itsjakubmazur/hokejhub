import { pragueDate } from "@hokejhub/core";
import { getScoreboard, revalidateFor } from "@/lib/server/scoreboard";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? pragueDate();
  if (!DATE_RE.test(date)) return Response.json({ error: "invalid date" }, { status: 400 });
  const data = await getScoreboard(date);
  const maxAge = revalidateFor(date);
  return Response.json(data, {
    headers: { "cache-control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 3}` },
  });
}
