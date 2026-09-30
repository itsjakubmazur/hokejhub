const HOKEJCZ = /^https:\/\/www\.hokej\.cz\/(static\/images|files\/logos)\//;

/** Routes hokej.cz images (player photos, club crests) through our CDN-cached relay (/api/img); other hosts load directly. */
export function imgSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (HOKEJCZ.test(url)) return `/api/img?p=${encodeURIComponent(url.slice("https://www.hokej.cz".length))}`;
  return url;
}
