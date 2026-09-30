import type { Metadata } from "next";
import { CalendarDays, ChartNoAxesColumnIncreasing, FlaskConical, Target } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import Link from "next/link";
import { addDays, esportsUrls, impliedProbs, modelTip, parseScoreboardAlt, pragueDate, predict } from "@hokejhub/core";
import { ClubLogo } from "@/components/club-logo";
import { GamblingNotice } from "@/components/gambling-notice";
import { TipInput } from "@/components/tip-input";
import { Card, Empty, Stat } from "@/components/ui/card";
import { formatTime } from "@/lib/format";
import { dbAvailable } from "@/lib/server/db";
import { fetchJson } from "@/lib/server/fetcher";
import { getBacktest, getEloState } from "@/lib/server/model";
import { getTeamLogos } from "@/lib/server/queries";
import { CS, csCount } from "@hokejhub/core";

export const metadata: Metadata = { title: "Predikce" };
export const revalidate = 300;

const pct = (v: number) => `${Math.round(v * 100)} %`;

export default async function PredictionsPage() {
  if (!dbAvailable()) return <Empty>Databáze není připojena.</Empty>;
  const today = pragueDate();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [elo, logos, bt, btRecent, ...boards] = await Promise.all([
    getEloState("cz-elh"),
    getTeamLogos("cz-elh"),
    getBacktest("cz-elh"),
    getBacktest("cz-elh", `${Number(today.slice(0, 4)) - 3}-07-01`),
    ...days.map((d) =>
      fetchJson(esportsUrls.scoreboardAlt(d), parseScoreboardAlt, {
        revalidate: 600,
        notFoundIsEmpty: true,
      }),
    ),
  ]);
  const upcoming = boards
    .flatMap((b) => b.data ?? [])
    .filter((g) => g.leagueKey === "cz-elh" && g.status === "scheduled" && g.home.hokejczClubId && g.away.hokejczClubId)
    .map((g) => {
      const h = `hcz-${g.home.hokejczClubId}`;
      const a = `hcz-${g.away.hokejczClubId}`;
      const p = predict(elo.state.ratings.get(h) ?? 1500, elo.state.ratings.get(a) ?? 1500);
      const m = g.preOdds ? impliedProbs(g.preOdds) : null;
      const edges = m
        ? (["home", "draw", "away"] as const).map((k) => ({ k, edge: p[k] - m[k], odds: g.preOdds![k] })).filter((e) => e.edge > 0.04)
        : [];
      return { g, h, a, p, m, edges };
    });
  const ranking = [...elo.state.ratings.entries()]
    .map(([id, r]) => ({
      id,
      r,
      name: elo.state.names.get(id) ?? id,
      hist: elo.state.history.get(id) ?? [],
    }))
    .filter((t) => t.hist.length && t.hist.at(-1)![0] > `${Number(today.slice(0, 4)) - 1}-07-01`)
    .sort((a, b) => b.r - a.r);

  return (
    <div className="space-y-4">
      <PageHero kicker="Elo · Poisson · xG" title="Predikce" icon={Target}>
        <p>
          Vlastní model: Elo z {elo.games.length.toLocaleString("cs-CZ")} zápasů extraligy → očekávané góly → Poissonovo rozdělení. Porovnání s kurzy
          Tipsportu (bez marže) ukazuje, kde se model a trh rozcházejí.
        </p>
      </PageHero>

      <Card title="Nadcházející zápasy" icon={CalendarDays}>
        {upcoming.length === 0 ? (
          <Empty>V příštích 7 dnech nejsou naplánované zápasy.</Empty>
        ) : (
          <ol className="divide-y divide-line">
            {upcoming.map(({ g, h, a, p, m, edges }) => (
              <li key={g.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_320px] sm:items-center">
                <Link href={`/zapas/${g.id}?d=${pragueDate(new Date(g.startAt))}`} className="flex items-center gap-2 hover:text-accent">
                  <span className="w-20 shrink-0 text-xs text-muted tabular">
                    {new Date(g.startAt).toLocaleDateString("cs-CZ", {
                      weekday: "short",
                      day: "numeric",
                      month: "numeric",
                    })}{" "}
                    {formatTime(g.startAt)}
                  </span>
                  <ClubLogo src={logos[h]} alt="" size={30} />
                  <span className="font-medium">{g.home.shortName}</span>
                  <span className="text-muted">–</span>
                  <span className="font-medium">{g.away.shortName}</span>
                  <ClubLogo src={logos[a]} alt="" size={30} />
                </Link>
                <div className="sm:col-span-2 sm:order-last">
                  <TipInput
                    game={{
                      gameId: g.id,
                      date: pragueDate(new Date(g.startAt)),
                      startAt: g.startAt,
                      home: g.home.shortName,
                      away: g.away.shortName,
                      homeLogo: logos[h] ?? null,
                      awayLogo: logos[a] ?? null,
                    }}
                    model={modelTip(p.expHome, p.expAway)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-1 text-center text-xs tabular">
                  {(["home", "draw", "away"] as const).map((k) => {
                    const hot = edges.some((e) => e.k === k);
                    return (
                      <div
                        key={k}
                        title={hot ? "Value: model dává vyšší šanci než kurz" : undefined}
                        className={`relative rounded-lg px-1 py-1.5 ${hot ? "bg-win/15 ring-1 ring-win" : "bg-surface-2"}`}
                      >
                        {hot ? <span className="absolute -top-2 right-1 rounded bg-win px-1 text-[9px] font-bold uppercase text-white">value</span> : null}
                        <div className="font-bold">{pct(p[k])}</div>
                        <div className="text-[10px] text-muted">
                          {m ? `trh ${pct(m[k])}` : "–"}
                          {g.preOdds?.[k] ? ` · ${g.preOdds[k]!.toFixed(2)}` : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-muted">
          Tipuj skóre a porovnej se s modelem v{" "}
          <Link href="/tipovacka" className="font-semibold text-accent">
            tipovačce
          </Link>
          .
        </p>
        <div className="mt-3">
          <GamblingNotice compact />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Elo žebříček" icon={ChartNoAxesColumnIncreasing}>
          <ol className="space-y-1.5">
            {ranking.map((t, i) => {
              const last = t.hist.slice(-20).map(([, r]) => r);
              const min = Math.min(...last);
              const max = Math.max(...last);
              const path = last
                .map((r, j) => `${j ? "L" : "M"}${(j / Math.max(1, last.length - 1)) * 80},${20 - ((r - min) / Math.max(1, max - min)) * 18}`)
                .join(" ");
              return (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-right text-muted tabular">{i + 1}.</span>
                  <ClubLogo src={logos[t.id]} alt="" size={26} />
                  <Link href={`/tym/${t.id}`} className="min-w-0 flex-1 truncate hover:text-accent">
                    {t.name}
                  </Link>
                  <svg viewBox="0 0 80 22" className="h-5 w-20" aria-hidden>
                    <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
                  </svg>
                  <span className="w-12 text-right font-bold tabular">{Math.round(t.r)}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-[11px] text-muted">Křivka = vývoj ratingu v posledních 20 zápasech.</p>
        </Card>

        <Card title="Jak přesný je model (backtest)" icon={FlaskConical}>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Trefa tipu (1/0/2)" value={pct(bt.accuracy)} sub={csCount(bt.games, CS.zapas)} />
            <Stat label="Posledních 3 sezóny" value={pct(btRecent.accuracy)} sub={`log-loss ${btRecent.logLoss.toFixed(3)}`} />
            <Stat label="Log-loss" value={bt.logLoss.toFixed(3)} sub="náhodný tip ≈ 1,099" />
            <Stat label="Brier skóre" value={bt.brier.toFixed(3)} sub="nižší = lepší" />
          </div>
          <h3 className="mb-2 mt-4 label text-muted">Kalibrace: předpověď vs. skutečnost (výhra domácích)</h3>
          <div className="space-y-1">
            {bt.calibration.map((c) => (
              <div key={c.bucket} className="grid grid-cols-[56px_1fr_60px] items-center gap-2 text-xs tabular">
                <span className="text-muted">
                  {Math.round(c.bucket * 100)}–{Math.round(c.bucket * 100) + 10} %
                </span>
                <div className="relative h-2 rounded-full bg-surface-2">
                  <div className="absolute h-2 rounded-full bg-accent/50" style={{ width: `${c.predicted * 100}%` }} />
                  <div className="absolute top-[-2px] h-3 w-0.5 bg-fg" style={{ left: `${c.observed * 100}%` }} />
                </div>
                <span className="text-right">
                  {pct(c.observed)} ({c.n})
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Pruh = průměrná předpověď v koši, čárka = skutečný podíl výher. Čím blíž, tím lépe kalibrovaný model.
          </p>
        </Card>
      </div>
    </div>
  );
}
