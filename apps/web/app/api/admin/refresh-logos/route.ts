import { sql } from "@/lib/server/db";

/**
 * POST /api/admin/refresh-logos — clubs change crests; hokej.cz's site navigation carries the
 * current one for every club of every league it covers. Reads that navigation (from a few
 * pages, since the rendered variant differs per request) and updates `team.logo_url` for
 * teams keyed by hokej.cz club id (hcz-<id>).
 */
export const dynamic = "force-dynamic";

const ORIGIN = process.env.HOKEJCZ_ORIGIN ?? "https://www.hokej.cz/";
const PAGES = ["historie", "tipsport-extraliga/table", "tipsport-extraliga/zapasy", "klub/hc-dynamo-pardubice/12"];
const LINK = /<a href="\/klub\/[^/"]+\/(\d+)"[^>]*>\s*<img[^>]*?srcset="[^"]*?min\.php\?file=([^&"\s]+)/g;

async function page(path: string) {
  const res = await fetch(new URL(path, ORIGIN), {
    headers: { "user-agent": "HokejHub/0.1 (personal, non-commercial)", accept: "text/html" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  return res?.ok ? res.text() : "";
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const found = new Map<string, string>();
  const pages: Record<string, { bytes: number; clubs: number }> = {};
  const debug: string[] = [];
  for (const path of PAGES) {
    const html = await page(path);
    if (new URL(req.url).searchParams.has("debug")) for (const m of html.matchAll(/\/klub\/[^/"]+\/12"/g)) debug.push(html.slice(m.index!, m.index! + 500));
    let clubs = 0;
    for (const m of html.matchAll(LINK)) {
      const file = decodeURIComponent(m[2]!);
      if (!/^\/files\/logos\/[\w.-]+\.(png|jpe?g|svg)$/i.test(file)) continue;
      clubs++;
      found.set(`hcz-${m[1]}`, `https://www.hokej.cz${file}`);
    }
    pages[path] = { bytes: html.length, clubs };
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
  return Response.json({ found: found.size, updated, changed, pages, debug });
}
