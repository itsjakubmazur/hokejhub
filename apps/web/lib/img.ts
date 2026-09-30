const HOKEJCZ = "https://www.hokej.cz/static/images/";

/** Routes hokej.cz images through our CDN-cached relay (/api/img); other hosts load directly. */
export function imgSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith(HOKEJCZ)) return `/api/img?p=${encodeURIComponent(url.slice("https://www.hokej.cz".length))}`;
  return url;
}
