import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import Link from "next/link";
import { HistoryTabs } from "@/components/history-tabs";
import { Card, Empty } from "@/components/ui/card";
import { franchiseOf, getCzechoslovakHistory } from "@/lib/server/history";
import { CS, csCount } from "@hokejhub/core";

export const metadata: Metadata = { title: "Historie československé ligy" };
export const dynamic = "force-dynamic";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const seasons = await getCzechoslovakHistory();
  if (seasons.length === 0) return <Empty>Historii se nepodařilo načíst z hokej.cz.</Empty>;
  const { s } = await searchParams;
  const selected = seasons.find((x) => String(x.season) === s) ?? null;

  const titles = new Map<string, number[]>();
  for (const x of seasons) {
    if (!x.champion) continue;
    const f = franchiseOf(x.champion);
    titles.set(f, [...(titles.get(f) ?? []), x.season]);
  }
  const ranking = [...titles.entries()].sort((a, b) => b[1].length - a[1].length || a[1][0]! - b[1][0]!);
  const maxTitles = ranking[0]?.[1].length ?? 1;
  const scorers = seasons
    .filter((x) => x.topScorer?.goals)
    .sort((a, b) => b.topScorer!.goals! - a.topScorer!.goals!)
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <PageHero kicker="1936 – 1993" title="Československá liga" icon={Landmark}>
        <p>
          {csCount(seasons.length, CS.rocnik)} nejvyšší soutěže – konečné tabulky, mistrovské sestavy a nejlepší střelci. Samostatná česká extraliga
          od 1993/94 je v <Link href="/liga/cz-elh?tab=historie">historii extraligy</Link>.
        </p>
      </PageHero>
      <HistoryTabs active="liga" />

      {selected ? <SeasonDetail season={selected} /> : null}

      <Card title="Mistři po sezónách">
        <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
          {seasons.map((x) => (
            <li key={x.season}>
              <Link
                href={`/historie?s=${x.season}`}
                scroll={false}
                className={`rise block rounded-xl border px-2.5 py-2 transition-colors hover:border-accent ${selected?.season === x.season ? "border-accent bg-accent-soft" : "border-line bg-surface-2"}`}
              >
                <span className="block text-[11px] text-muted tabular">{x.label}</span>
                <span className="block truncate text-sm font-semibold">{x.champion ?? "nedohráno"}</span>
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Nejvíc titulů">
          <ol className="space-y-2">
            {ranking.map(([club, years], i) => (
              <li key={club} className="grid grid-cols-[20px_1fr_auto] items-center gap-2 text-sm">
                <span className="text-right text-muted tabular">{i + 1}.</span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{club}</div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                    <div
                      className="grow-x h-full rounded-full bg-gold"
                      style={{
                        width: `${(years.length / maxTitles) * 100}%`,
                        animationDelay: `${i * 60}ms`,
                      }}
                    />
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted">{years.map((y) => `${y}/${String(y + 1).slice(2)}`).join(", ")}</div>
                </div>
                <span className="text-xl font-black tabular">{years.length}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Nejvíc gólů v sezóně (nejlepší střelci)">
          <ol className="space-y-1.5">
            {scorers.map((x, i) => (
              <li key={x.season} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-right text-muted tabular">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{x.topScorer!.name}</span>{" "}
                  <span className="text-muted">
                    ({x.topScorer!.team}, {x.label})
                  </span>
                </span>
                <span className="font-black tabular">{x.topScorer!.goals}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
      <p className="text-[11px] text-muted">Zdroj: hokej.cz – Historie, domácí soutěže.</p>
    </div>
  );
}

function SeasonDetail({ season }: { season: Awaited<ReturnType<typeof getCzechoslovakHistory>>[number] }) {
  return (
    <Card
      title={`Sezóna ${season.label}`}
      action={
        <Link href="/historie" scroll={false} className="text-xs text-muted hover:text-fg">
          zavřít ✕
        </Link>
      }
    >
      <div className="space-y-4">
        {season.champion ? (
          <div className="flex items-center gap-3 border-l-4 border-gold bg-surface-2 p-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Mistr</div>
              <div className="display text-3xl">{season.champion}</div>
            </div>
            {season.topScorer ? (
              <div className="ml-auto text-right text-sm">
                <div className="text-xs uppercase tracking-wide text-muted">Nejlepší střelec</div>
                <div className="font-semibold">
                  {season.topScorer.name} {season.topScorer.goals ? <span className="tabular">({season.topScorer.goals})</span> : null}
                </div>
                <div className="text-xs text-muted">{season.topScorer.team}</div>
              </div>
            ) : null}
          </div>
        ) : null}
        {season.tables.map((t, ti) => (
          <div key={ti}>
            <h3 className="mb-1 label text-muted">{t.title}</h3>
            <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[440px] text-sm tabular">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="w-7 py-1 text-right">#</th>
                    <th className="py-1 pl-2 text-left">Tým</th>
                    <th className="text-right">Z</th>
                    <th className="text-right">V</th>
                    <th className="text-right">R</th>
                    <th className="text-right">P</th>
                    <th className="text-right">Skóre</th>
                    <th className="pr-1 text-right">B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {t.rows.map((r) => (
                    <tr key={r.rank + r.team} className={r.rank === 1 && ti === 0 ? "font-semibold" : ""}>
                      <td className="py-1 text-right text-muted">{r.rank}.</td>
                      <td className="py-1 pl-2">{r.team}</td>
                      <td className="text-right">{r.gp ?? "–"}</td>
                      <td className="text-right">{r.w ?? "–"}</td>
                      <td className="text-right">{r.t ?? "–"}</td>
                      <td className="text-right">{r.l ?? "–"}</td>
                      <td className="text-right">
                        {r.gf}:{r.ga}
                      </td>
                      <td className="pr-1 text-right font-bold">{r.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {season.results.length ? (
          <div>
            <h3 className="mb-1 label text-muted">Play-off a konečné pořadí</h3>
            <ul className="space-y-1 text-sm">
              {season.results.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {season.rosters.length ? (
          <div>
            <h3 className="mb-1 label text-muted">Sestavy medailistů</h3>
            <ul className="space-y-2 text-sm">
              {season.rosters.map((r, i) => (
                <li key={i}>
                  <span className="font-semibold">
                    {i + 1}. {r.team}:
                  </span>{" "}
                  <span className="text-fg/80">{r.players}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {season.notes.length ? (
          <details className="text-sm text-muted">
            <summary className="cursor-pointer">Poznámky a nižší soutěže</summary>
            <div className="mt-2 space-y-1">
              {season.notes.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </Card>
  );
}
