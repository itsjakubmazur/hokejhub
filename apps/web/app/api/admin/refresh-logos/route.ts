import { sql } from "@/lib/server/db";

/**
 * POST /api/admin/refresh-logos — clubs change crests; hokej.cz's site navigation carries the
 * current one for every club of every league it covers. Reads that navigation and updates
 * `team.logo_url` for teams keyed by hokej.cz club id (hcz-<id>).
 */
export const dynamic = "force-dynamic";

const ORIGIN = process.env.HOKEJCZ_ORIGIN ?? "https://www.hokej.cz/";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const res = await fetch(new URL("historie", ORIGIN), { headers: { "user-agent": "HokejHub/0.1 (personal, non-commercial)", accept: "text/html" } });
  if (!res.ok) return Response.json({ error: `hokej.cz ${res.status}` }, { status: 502 });
  const html = await res.text();
  const found = new Map<string, string>();
  for (const m of html.matchAll(/<a href="\/klub\/[^/"]+\/(\d+)">\s*<img srcset="[^"]*?min\.php\?file=([^&"\s]+)/g)) {
    const file = decodeURIComponent(m[2]!);
    if (/^\/files\/logos\/[\w.-]+\.(png|jpe?g|svg)$/i.test(file)) found.set(`hcz-${m[1]}`, `https://www.hokej.cz${file}`);
  }
  let updated = 0;
  const changed: { id: string; from: string | null; to: string }[] = [];
  for (const [id, url] of found) {
    const rows = await sql<{ id: string; logo_url: string | null }>(
      "update team set logo_url = $2 where id = $1 and logo_url is distinct from $2 returning id, (select logo_url from team t2 where t2.id = $1) as logo_url",
      [id, url],
    );
    if (rows.length) {
      updated++;
      changed.push({ id, from: rows[0]!.logo_url, to: url });
    }
  }
  return Response.json({ found: found.size, updated, changed });
}
