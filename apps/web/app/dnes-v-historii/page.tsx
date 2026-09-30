import type { Metadata } from "next";
import Link from "next/link";
import { DbGameLine } from "@/components/db-game-line";
import { Cake, CalendarClock, ChevronLeft, ChevronRight, Flame, History } from "lucide-react";
import { Portrait } from "@/components/portrait";
import { PageHero } from "@/components/ui/page-hero";
import { Card, Empty } from "@/components/ui/card";
import { dbAvailable } from "@/lib/server/db";
import { bigNightsOnThisDay, birthdaysOnThisDay, gamesOnThisDay } from "@/lib/server/hub";
import { pragueDate } from "@hokejhub/core";

export const metadata: Metadata = { title: "Tento den v historii" };
export const revalidate = 3600;

const MONTHS = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];

export default async function OnThisDay({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  if (!dbAvailable()) return <Empty>Databáze není připojena.</Empty>;
  const { d } = await searchParams;
  const today = pragueDate();
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(d ?? "");
  const month = m ? Number(m[1]) : Number(today.slice(5, 7));
  const day = m ? Number(m[2]) : Number(today.slice(8, 10));
  const [games, births, nights] = await Promise.all([gamesOnThisDay(month, day), birthdaysOnThisDay(month, day), bigNightsOnThisDay(month, day)]);
  const year = Number(today.slice(0, 4));
  const shift = (delta: number) => {
    const x = new Date(Date.UTC(2024, month - 1, day + delta));
    return `/dnes-v-historii?d=${x.getUTCMonth() + 1}-${x.getUTCDate()}`;
  };
  const byYear = new Map<number, typeof games>();
  for (const g of games) {
    const y = new Date(g.start_at).getUTCFullYear();
    byYear.set(y, [...(byYear.get(y) ?? []), g]);
  }

  return (
    <div className="space-y-4">
      <PageHero
        kicker="Tento den v historii"
        title={`${day}. ${MONTHS[month - 1]}`}
        icon={CalendarClock}
        aside={
          <div className="flex gap-2">
            <Link
              href={shift(-1)}
              className="grid size-10 place-items-center border border-board-line text-board-muted hover:text-led"
              aria-label="Předchozí den"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Link>
            <Link
              href={shift(1)}
              className="grid size-10 place-items-center border border-board-line text-board-muted hover:text-led"
              aria-label="Další den"
            >
              <ChevronRight className="size-5" aria-hidden />
            </Link>
          </div>
        }
      />

      {nights.length ? (
        <Card title="Velké individuální večery (hattricky a 4+ body)" icon={Flame}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {nights.map((n) => (
              <li key={`${n.game_id}-${n.player_id}`} className="flex items-center gap-3 bg-surface-2 pr-3">
                <Portrait src={n.headshot} alt={n.name} width={64} />
                <div className="min-w-0 flex-1">
                  <Link href={`/hrac/${n.player_id}`} className="font-semibold hover:text-accent">
                    {n.name}
                  </Link>
                  <div className="truncate text-xs text-muted">
                    {n.team_name} vs. {n.opp_name} ·{" "}
                    <Link href={`/zapas/${n.game_id}`} className="hover:text-fg">
                      {new Date(n.start_at).getFullYear()}
                    </Link>
                  </div>
                </div>
                <div className="text-right tabular">
                  <div className="display text-2xl">
                    {n.goals}+{n.assists}
                  </div>
                  {n.goals >= 3 ? <div className="text-[10px] font-bold uppercase text-gold">hattrick</div> : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card title={`Zápasy extraligy v tento den (${games.length})`} icon={History}>
          {games.length === 0 ? (
            <Empty>V tento den se v extralize nehrálo (nebo ještě nemáme data).</Empty>
          ) : (
            <div className="space-y-3">
              {[...byYear.entries()].map(([y, list]) => (
                <section key={y}>
                  <h3 className="mb-1 flex items-baseline gap-2 text-sm font-bold">
                    {y}{" "}
                    <span className="text-xs font-normal text-muted">
                      {year - y === 0 ? "letos" : year - y === 1 ? "před rokem" : `před ${year - y} lety`}
                    </span>
                  </h3>
                  {list.map((g) => (
                    <DbGameLine key={g.id} g={g} showSeason={false} />
                  ))}
                </section>
              ))}
            </div>
          )}
        </Card>
        <Card title="Narozeniny" icon={Cake}>
          {births.length === 0 ? (
            <Empty>Nikdo z extraligy.</Empty>
          ) : (
            <ul className="space-y-2">
              {births.map((b) => (
                <li key={b.id} className="flex items-center gap-2.5">
                  <Portrait src={b.headshot} alt={b.name} width={40} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/hrac/${b.id}`} className="block truncate font-medium hover:text-accent">
                      {b.name}
                    </Link>
                    <span className="text-xs text-muted">
                      {year - Number(b.birth_date.slice(0, 4))} let · {b.games} záp., {b.points} b.
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
