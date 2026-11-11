import type { MetadataRoute } from "next";

/**
 * A personal app, not a site to index: tens of thousands of player, team and game pages are
 * each rendered from the database on demand, and crawlers walking them spend the hosting plan.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
