import { pragueDate } from "@hokejhub/core";
import { Scoreboard } from "@/components/scoreboard";
import { getScoreboard } from "@/lib/server/scoreboard";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { date: raw } = await searchParams;
  const date = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : pragueDate();
  const initial = await getScoreboard(date);
  return <Scoreboard key={date} date={date} initial={initial} />;
}
