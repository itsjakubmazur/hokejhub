import type { BracketSeries, BracketStage } from "@hokejhub/core";
import { csPlural } from "@hokejhub/core";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { ClubLogo } from "../club-logo";

const WINS: readonly [string, string, string] = ["vítězství", "vítězství", "vítězství"];

function SeriesCard({ s, logos, delay }: { s: BracketSeries; logos: Record<string, string | null>; delay: number }) {
  const row = (id: string, name: string, wins: number, other: number) => {
    const won = s.winner === id;
    const lost = s.winner !== null && !won;
    return (
      <div className={`flex items-center gap-2.5 px-2.5 py-2 ${won ? "bg-surface-2" : ""}`}>
        <ClubLogo src={logos[id]} alt="" size={32} className={lost ? "opacity-50" : ""} />
        <Link
          href={`/tym/${id}`}
          className={`min-w-0 flex-1 truncate text-sm hover:text-accent ${won ? "font-bold" : lost ? "text-muted" : "font-medium"}`}
        >
          {name}
        </Link>
        <span
          className={`display w-7 text-center text-2xl leading-none tabular ${won ? "text-accent" : lost ? "text-muted" : wins > other ? "text-fg" : "text-muted"}`}
        >
          {wins}
        </span>
      </div>
    );
  };
  return (
    <div className="bracket-card rise relative w-full border border-line bg-surface" style={{ animationDelay: `${delay}ms` }}>
      {row(s.top, s.topName, s.topWins, s.bottomWins)}
      <div className="h-px bg-line" />
      {row(s.bottom, s.bottomName, s.bottomWins, s.topWins)}
      <div className="flex flex-wrap gap-1 border-t border-line px-2.5 py-1.5">
        {s.games.map((g, i) => (
          <Link
            key={g.id}
            href={`/zapas/${g.id}`}
            title={`${i + 1}. zápas`}
            className={`px-1 text-[11px] tabular hover:text-accent ${g.topScore > g.bottomScore ? "text-fg" : "text-muted"}`}
          >
            {g.topScore}:{g.bottomScore}
            {g.decidedIn === "OT" ? "p" : g.decidedIn === "SO" ? "sn" : ""}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Champion({ champ, champId, logos, delay }: { champ: BracketSeries; champId: string; logos: Record<string, string | null>; delay: number }) {
  return (
    <div className="champion rise relative mt-6 overflow-hidden bg-board p-5 text-center text-board-text" style={{ animationDelay: `${delay}ms` }}>
      <Trophy className="mx-auto size-8 text-gold" aria-hidden />
      <p className="label mt-2 text-gold">Mistr extraligy</p>
      <Link href={`/tym/${champId}`} className="mt-3 block">
        <ClubLogo src={logos[champId]} alt="" size={88} className="mx-auto" />
        <div className="display mt-3 text-xl">{champId === champ.top ? champ.topName : champ.bottomName}</div>
      </Link>
      <p className="mt-1 text-xs text-board-muted tabular">
        finále {Math.max(champ.topWins, champ.bottomWins)}:{Math.min(champ.topWins, champ.bottomWins)}
      </p>
    </div>
  );
}

/**
 * Play-off as a bracket: one column per round, series lined up next to the ones they feed,
 * connectors drawn between rounds and the champion at the end.
 */
export function PlayoffBracket({ stages, logos }: { stages: BracketStage[]; logos: Record<string, string | null> }) {
  const main = stages.filter((s) => s.name !== "O 3. místo");
  const bronze = stages.find((s) => s.name === "O 3. místo");
  const final = main.at(-1);
  const champ = final?.series.length === 1 && final.series[0]!.winner ? final.series[0]! : null;
  const champId = champ?.winner ?? null;

  return (
    <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0 pb-2 pt-1 [scrollbar-width:thin]">
      <div className="flex min-w-max gap-10">
        {main.map((stage, col) => {
          const next = main[col + 1];
          const paired = next ? next.series.length * 2 === stage.series.length : false;
          const feeds = next ? (paired ? "pair" : "straight") : "none";
          const groups: BracketSeries[][] = paired
            ? stage.series.reduce<BracketSeries[][]>((acc, s, i) => (i % 2 ? acc[acc.length - 1]!.push(s) : acc.push([s]), acc), [])
            : stage.series.map((s) => [s]);
          return (
            <section key={stage.name} className="flex w-60 flex-col">
              <header className="mb-3">
                <h3 className="label text-fg">{stage.name}</h3>
                <p className="text-[11px] text-muted">
                  na {stage.bestOf > 1 ? `${(stage.bestOf + 1) / 2} ${csPlural((stage.bestOf + 1) / 2, WINS)}` : "1 zápas"}
                </p>
              </header>
              <div className="flex flex-1 flex-col">
                {groups.map((g, gi) => (
                  <div key={gi} className={`relative flex flex-1 flex-col ${feeds === "pair" ? "bracket-pair" : ""}`}>
                    {g.map((s, si) => (
                      <div
                        key={s.key}
                        className={`relative flex flex-1 items-center py-2 ${col > 0 ? "bracket-in" : ""} ${feeds === "straight" ? "bracket-out" : ""} ${feeds === "pair" ? "bracket-stub" : ""}`}
                      >
                        <div className="relative w-full">
                          <SeriesCard s={s} logos={logos} delay={col * 140 + (gi * 2 + si) * 40} />
                          {!next ? (
                            // The champion hangs below the final so the final stays centred between its feeders.
                            <div className="absolute inset-x-0 top-full">
                              {champ && champId ? <Champion champ={champ} champId={champId} logos={logos} delay={main.length * 140 + 120} /> : null}
                              {bronze ? (
                                <div className="mt-6">
                                  <h3 className="label mb-2 text-fg">O 3. místo</h3>
                                  {bronze.series.map((b) => (
                                    <SeriesCard key={b.key} s={b} logos={logos} delay={main.length * 140} />
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
