import type { Metadata } from "next";
import { TipApp } from "@/components/tipping/tip-app";
import { dbAvailable, sql } from "@/lib/server/db";

export const metadata: Metadata = { title: "Tipovačka" };
export const dynamic = "force-dynamic";

/** Current extraliga clubs (played in the last year) for the avatar picker. */
async function clubs() {
  if (!dbAvailable()) return [];
  return sql<{ id: string; name: string; logo: string | null }>(
    `select t.id, t.short_name as name, t.logo_url as logo from team t
     where t.league_id = 'cz-elh' and exists (
       select 1 from game g where (g.home_team_id = t.id or g.away_team_id = t.id) and g.start_at > now() - interval '400 days')
     order by t.short_name`,
  ).catch(() => []);
}

export default async function TipsPage() {
  return <TipApp clubs={await clubs()} />;
}
