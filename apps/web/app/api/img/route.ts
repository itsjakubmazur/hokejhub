/**
 * Image relay for hokej.cz player photos and club logos. Browsers hotlinking 40+ photos at once
 * got part of them refused, so each image is fetched here once and served from the CDN cache for
 * a month. Only public images under /static/images/ and club crests under /files/logos/ on hokej.cz are relayed.
 */
const ALLOW = /^\/(static\/images\/[\w./-]+|files\/logos\/[\w.-]+)\.(png|jpe?g|gif|webp|svg)$/i;
const MONTH = 30 * 86400;

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("p") ?? "";
  if (!ALLOW.test(path) || path.includes("..")) return new Response("not allowed", { status: 403 });
  const res = await fetch(new URL(path, "https://www.hokej.cz/"), {
    headers: { "user-agent": "HokejHub/0.1 (personal, non-commercial)", accept: "image/*" },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  const type = res?.headers.get("content-type") ?? "";
  if (!res || !res.ok || !type.startsWith("image/")) {
    // Short negative cache: a missing photo may appear later, a transient error should not stick.
    return new Response(null, { status: 404, headers: { "cache-control": "public, s-maxage=600" } });
  }
  return new Response(res.body, {
    headers: {
      "content-type": type,
      "cache-control": `public, max-age=${MONTH}, s-maxage=${MONTH}, stale-while-revalidate=${MONTH}, immutable`,
    },
  });
}
