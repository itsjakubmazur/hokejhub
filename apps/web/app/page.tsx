import { pragueDate } from "@hokejhub/core";
import { Scoreboard } from "@/components/scoreboard";
import { after } from "next/server";
import { warmGamePreviews } from "@/lib/server/game";
import { ingestFinishedElh } from "@/lib/server/ingest";
import { settle } from "@/lib/server/tipping";
import { getScoreboard } from "@/lib/server/scoreboard";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { date: raw } = await searchParams;
  const date = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : pragueDate();
  const initial = await getScoreboard(date);
  after(async () => {
    await ingestFinishedElh(initial.games).catch((e) => console.error("[ingest] home", e));
    if (initial.games.some((g) => g.status === "final")) await settle().catch((e) => console.error("[tip] settle", e));
    await warmGamePreviews(initial.games);
  });
  return <Scoreboard key={date} date={date} initial={initial} />;
}
