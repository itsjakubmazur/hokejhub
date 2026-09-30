import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameCenter } from "@/components/game-center";
import { cache } from "react";
import { getGameDetail } from "@/lib/server/game";

// generateMetadata and the page share one fetch per request.
const detailFor = cache((id: string, date: string | undefined) => getGameDetail(id, date));

async function load(props: PageProps<"/zapas/[id]">) {
  const { id } = await props.params;
  const { d } = await props.searchParams;
  const date = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined;
  return { id, date, detail: await detailFor(id, date) };
}

export async function generateMetadata(props: PageProps<"/zapas/[id]">): Promise<Metadata> {
  const { id, date, detail } = await load(props);
  if (!detail) return { title: "Zápas" };
  const g = detail.game;
  const score = g.homeScore !== null ? ` ${g.homeScore}:${g.awayScore}` : "";
  const title = `${g.home.shortName}${score} ${g.away.shortName}`;
  const image = `/api/og/zapas/${id}${date ? `?d=${date}` : ""}`;
  return {
    title,
    openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}

export default async function GamePage(props: PageProps<"/zapas/[id]">) {
  const { id, date, detail } = await load(props);
  if (!detail) notFound();
  return <GameCenter id={id} date={date} initial={detail} />;
}
