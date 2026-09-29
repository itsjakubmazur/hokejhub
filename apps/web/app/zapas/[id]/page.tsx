import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameCenter } from "@/components/game-center";
import { getGameDetail } from "@/lib/server/game";

async function load(props: PageProps<"/zapas/[id]">) {
  const { id } = await props.params;
  const { d } = await props.searchParams;
  const date = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined;
  return { id, date, detail: await getGameDetail(id, date) };
}

export async function generateMetadata(props: PageProps<"/zapas/[id]">): Promise<Metadata> {
  const { detail } = await load(props);
  if (!detail) return { title: "Zápas" };
  const g = detail.game;
  const score = g.homeScore !== null ? ` ${g.homeScore}:${g.awayScore}` : "";
  return { title: `${g.home.shortName}${score} ${g.away.shortName}` };
}

export default async function GamePage(props: PageProps<"/zapas/[id]">) {
  const { id, date, detail } = await load(props);
  if (!detail) notFound();
  return <GameCenter id={id} date={date} initial={detail} />;
}
