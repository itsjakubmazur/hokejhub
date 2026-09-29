"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { impliedProbs, pragueDate, type BetDistribution, type Game, type Odds1x2 } from "@hokejhub/core";
import type { GameDetailResponse } from "@/lib/types";
import { formatDayLong, formatOdds, formatPct, formatTime } from "@/lib/format";
import { GamblingNotice } from "./gambling-notice";
import { GoalCelebration } from "./game/goal-celebration";
import { HeadToHead } from "./game/h2h";
import { Insights } from "./game/insights";
import { Commentary } from "./game/commentary";
import { PredictionCard } from "./game/prediction";
import { WinProbability } from "./game/win-probability";
import { LiveClock } from "./game/live-clock";
import { Lineups } from "./game/lineups";
import { PeriodStats } from "./game/period-stats";
import { PlayersTable } from "./game/players-table";
import { Timeline } from "./game/timeline";
import { XgFlow } from "./game/xg-flow";
import { HokejczBoxScore, HokejczInfo } from "./hokejcz-box";
import { ShotMap } from "./shot-map";
import { SourceStatus } from "./source-status";
import { TeamLogo } from "./team-logo";
import { PlayerPhoto } from "./player-photo";
import { ShareButton } from "./share-button";
import { useGoalFlash } from "./use-goal-flash";

const easternDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(iso));

const isLive = (g: Game) => g.status === "live" || g.status === "intermission";

type Tab = "prehled" | "prenos" | "statistiky" | "sestavy" | "strely" | "hraci" | "h2h" | "kurzy";

export function GameCenter({ id, date, initial }: { id: string; date?: string; initial: GameDetailResponse }) {
  const { data } = useQuery({
    queryKey: ["game", id],
    queryFn: async (): Promise<GameDetailResponse> => {
      const res = await fetch(`/api/game/${id}${date ? `?d=${date}` : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    initialData: initial,
    refetchInterval: (q) => (q.state.data && isLive(q.state.data.game) ? 15_000 : false),
  });
  const { game } = data;
  const day = game.source === "nhl" ? easternDate(game.startAt) : pragueDate(new Date(game.startAt));

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "prehled", label: "Přehled", show: true },
    { id: "prenos", label: "Přenos", show: Boolean(data.commentary?.length) },
    { id: "statistiky", label: "Statistiky", show: Boolean(data.periodStats || data.box || data.shots?.length) },
    { id: "sestavy", label: "Sestavy", show: Boolean(data.lineups) },
    { id: "strely", label: "Střely & xG", show: Boolean(data.shots?.length) },
    { id: "hraci", label: "Hráči", show: Boolean(data.playerStats || data.box?.skaters.home.length) },
    { id: "h2h", label: "H2H", show: Boolean(data.teamIds && data.h2h) },
    { id: "kurzy", label: "Kurzy", show: Boolean(game.preOdds || data.liveOdds || data.bets) },
  ];
  const visible = tabs.filter((t) => t.show);

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = visible.some((t) => t.id === requested) ? requested! : "prehled";
  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    if (t === "prehled") next.delete("tab");
    else next.set("tab", t);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-3">
      <MatchHeader game={game} data={data} day={day} />
      <SourceStatus sources={data.sources} />

      <nav className="no-scrollbar sticky top-14 z-20 -mx-4 flex gap-1 overflow-x-auto border-b border-line bg-bg/85 px-4 backdrop-blur-xl sm:mx-0 sm:px-0">
        {visible.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative shrink-0 px-3 py-3 text-sm font-semibold uppercase tracking-wide transition-colors ${
              tab === t.id ? "text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {t.label}
            {tab === t.id ? (
              <motion.span layoutId="game-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-live" />
            ) : null}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "prehled" ? <Overview data={data} day={day} /> : null}
          {tab === "prenos" && data.commentary ? (
            <Card title="Textový přenos">
              <Commentary comments={data.commentary} game={game} />
            </Card>
          ) : null}
          {tab === "statistiky" ? (
            <Card title="Statistiky zápasu">
              <PeriodStats game={game} stats={data.periodStats} box={data.box} shots={data.shots} />
              {data.faceoffZones ? <FaceoffZones game={game} zones={data.faceoffZones} /> : null}
            </Card>
          ) : null}
          {tab === "sestavy" ? <Lineups game={game} lineups={data.lineups} stats={data.playerStats} box={data.box} photos={data.photos} /> : null}
          {tab === "strely" && data.shots ? <ShotsTab data={data} /> : null}
          {tab === "hraci" ? (
            data.playerStats ? (
              <Card title="Statistiky hráčů">
                <PlayersTable game={game} stats={data.playerStats} box={data.box} photos={data.photos} />
              </Card>
            ) : data.box ? (
              <HokejczBoxScore box={data.box} />
            ) : null
          ) : null}
          {tab === "h2h" && data.teamIds && data.h2h ? (
            <Card title="Vzájemné zápasy">
              <HeadToHead game={game} games={data.h2h} teamIds={data.teamIds} />
            </Card>
          ) : null}
          {tab === "kurzy" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <OddsCard pre={game.preOdds} live={isLive(game) ? data.liveOdds : null} game={game} />
              {data.bets ? <BetsCard bets={data.bets} game={game} /> : null}
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Overview({ data, day }: { data: GameDetailResponse; day: string }) {
  const { game } = data;
  const xg = data.shots?.some((s) => s.xg !== undefined)
    ? [
        data.shots.filter((s) => s.teamId === game.home.id).reduce((a, s) => a + (s.xg ?? 0), 0),
        data.shots.filter((s) => s.teamId !== game.home.id).reduce((a, s) => a + (s.xg ?? 0), 0),
      ]
    : null;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        {data.insights ? (
          <Card title="Zajímavosti">
            <Insights game={game} data={data} />
          </Card>
        ) : null}
        {data.prediction && game.status !== "scheduled" ? (
          <Card title="Pravděpodobnost výhry v průběhu zápasu">
            <WinProbability
              game={game}
              goals={goalMoments(data)}
              expHome={data.prediction.expHome}
              expAway={data.prediction.expAway}
              elapsedNow={game.status === "final" ? 3600 : elapsedNow(data)}
            />
          </Card>
        ) : null}
        {game.status !== "scheduled" ? (
          <Card title="Průběh zápasu">
            <Timeline game={game} box={data.box} goals={data.goals} photos={data.photos} />
          </Card>
        ) : null}
      </div>
      <div className="space-y-4">
        {xg ? (
          <Card title="Očekávané góly (xG)">
            <div className="flex items-end justify-between">
              <BigNumber value={xg[0]!} side="home" label={game.home.shortName} />
              <span className="pb-2 text-xs text-muted">vs</span>
              <BigNumber value={xg[1]!} side="away" label={game.away.shortName} />
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Součet pravděpodobností gólu všech střel podle místa, úhlu a herní situace.
            </p>
          </Card>
        ) : null}
        {data.prediction ? (
          <Card title={game.status === "scheduled" ? "Predikce" : "Predikce před zápasem"}>
            <PredictionCard game={game} prediction={data.prediction} odds={game.preOdds} />
          </Card>
        ) : null}
        {game.preOdds || data.liveOdds ? <OddsCard pre={game.preOdds} live={isLive(game) ? data.liveOdds : null} game={game} /> : null}
        <Card title="Informace">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted">Soutěž</dt>
            <dd>{game.leagueName}</dd>
            <dt className="text-muted">Začátek</dt>
            <dd className="first-letter:uppercase">
              {formatDayLong(day)}, {formatTime(game.startAt)}
            </dd>
            {game.series ? (
              <>
                <dt className="text-muted">Série</dt>
                <dd>{game.series}</dd>
              </>
            ) : null}
            {data.box ? <HokejczInfo box={data.box} /> : null}
          </dl>
        </Card>
      </div>
    </div>
  );
}

function clockSeconds(t: string) {
  const m = /^(\d+):(\d{2})$/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Goals as [elapsed seconds, side] from the hokej.cz box or the NHL scoring summary. */
function goalMoments(data: GameDetailResponse): [number, "home" | "away"][] {
  if (data.box) {
    return data.box.goals
      .map((g) => [clockSeconds(g.time), g.team === data.box!.home.abbrev ? "home" : "away"] as const)
      .filter((g): g is [number, "home" | "away"] => g[0] !== null && g[0] <= 3900);
  }
  return (data.goals ?? [])
    .filter((g) => g.periodType !== "SO")
    .map((g) => [(g.period - 1) * 1200 + (clockSeconds(g.time) ?? 0), g.teamAbbrev === data.game.home.abbrev ? "home" : "away"]);
}

function elapsedNow(data: GameDetailResponse) {
  if (data.clock) return data.clock.gameSeconds;
  const minute = Number.parseInt(data.game.clock ?? "", 10);
  return Number.isFinite(minute) ? minute * 60 : (data.game.period ?? 1) * 1200;
}

function BigNumber({ value, side, label }: { value: number; side: "home" | "away"; label: string }) {
  return (
    <div className={side === "away" ? "text-right" : ""}>
      <motion.div
        className="text-3xl font-bold tabular"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {value.toFixed(2)}
      </motion.div>
      <div className="flex items-center gap-1.5 text-xs text-muted">
        {side === "home" ? <span className="size-2 rounded-full bg-home" /> : null}
        {label}
        {side === "away" ? <span className="size-2 rounded-full bg-away" /> : null}
      </div>
    </div>
  );
}

function ShotsTab({ data }: { data: GameDetailResponse }) {
  const { game } = data;
  const shots = data.shots!;
  const hasXg = shots.some((s) => s.xg !== undefined);
  // Top shooters by xG.
  const byShooter = new Map<string, { name: string; id: string | null; side: "home" | "away"; xg: number; shots: number; goals: number }>();
  for (const s of shots) {
    if (s.type === "blocked-shot") continue;
    const name = s.shooterName ?? (s.shooterId ? data.players?.[s.shooterId]?.name : null);
    if (!name) continue;
    const e = byShooter.get(name) ?? {
      name,
      id: game.source === "nhl" ? null : s.shooterId ? `hcz-${s.shooterId}` : null,
      side: s.teamId === game.home.id ? ("home" as const) : ("away" as const),
      xg: 0,
      shots: 0,
      goals: 0,
    };
    e.xg += s.xg ?? 0;
    e.shots++;
    if (s.type === "goal") e.goals++;
    byShooter.set(name, e);
  }
  const top = [...byShooter.values()].sort((a, b) => b.xg - a.xg).slice(0, 8);
  const maxXg = top[0]?.xg ?? 1;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card title="Mapa střel">
          <ShotMap shots={shots} homeId={game.home.id} players={data.players} homeAbbrev={game.home.abbrev} awayAbbrev={game.away.abbrev} />
        </Card>
        {hasXg ? (
          <Card title="Průběh xG">
            <XgFlow game={game} shots={shots} />
          </Card>
        ) : null}
      </div>
      {hasXg && top.length > 0 ? (
        <Card title="Nejnebezpečnější střelci (xG)">
          <ol className="space-y-2.5">
            {top.map((p, i) => (
              <li key={p.name} className="text-sm">
                <div className="flex justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    <span className="text-muted tabular">{i + 1}.</span>
                    <PlayerPhoto src={p.id ? data.photos?.[p.id] : null} alt={p.name} size={26} ring={p.side} />
                    {p.id ? (
                      <Link href={`/hrac/${p.id}`} className="truncate hover:text-accent">
                        {p.name}
                      </Link>
                    ) : (
                      <span className="truncate">{p.name}</span>
                    )}
                  </span>
                  <span className="shrink-0 tabular">
                    <span className="font-semibold">{p.xg.toFixed(2)}</span>
                    <span className="text-xs text-muted"> · {p.shots} stř. · {p.goals} G</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <motion.div
                    className={`h-full rounded-full ${p.side === "home" ? "bg-home" : "bg-away"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(p.xg / maxXg) * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.05 }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </div>
  );
}

function FaceoffZones({ game, zones }: { game: Game; zones: { home: number[]; away: number[] } }) {
  const labels = ["Obranné pásmo", "Střední pásmo", "Útočné pásmo"];
  return (
    <div className="mt-6 border-t border-line pt-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Vhazování podle pásem</h3>
      <div className="grid grid-cols-3 gap-2">
        {labels.map((l, i) => {
          const h = zones.home[i] ?? 0;
          const a = zones.away[2 - i] ?? 0;
          return (
            <div key={l} className="rounded-xl bg-surface-2 p-3 text-center">
              <div className="text-[11px] text-muted">{l}</div>
              <div className="mt-1 text-lg font-bold tabular">{Math.round(h)} %</div>
              <div className="text-[11px] text-muted">
                {game.home.abbrev} · soupeř {Math.round(a)} %
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchHeader({ game, data, day }: { game: Game; data: GameDetailResponse; day: string }) {
  const flash = useGoalFlash(game.homeScore, game.awayScore);
  const pathname = usePathname();
  const started = game.homeScore !== null;
  const live = isLive(game);
  const lastSide = flash.home + flash.away === 0 ? "home" : flash.home >= flash.away ? "home" : "away";
  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <Link href={day === pragueDate() ? "/" : `/?date=${day}`} className="hover:text-fg">
          ← {game.leagueName}
          {data.box?.round ? ` · ${data.box.round}` : ""}
        </Link>
        <span className="flex items-center gap-3">
          <span className="tabular">
            {new Intl.DateTimeFormat("cs-CZ", { timeZone: "Europe/Prague", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(game.startAt))}{" "}
            {formatTime(game.startAt)}
          </span>
          <span className="normal-case tracking-normal">
            <ShareButton
              title={`${game.home.shortName} ${started ? `${game.homeScore}:${game.awayScore}` : "vs"} ${game.away.shortName}`}
              image={`/api/og${pathname}?d=${day}`}
            />
          </span>
        </span>
      </div>
      <div
        className="pointer-events-none absolute inset-0 top-10 opacity-70"
        style={{
          background:
            "radial-gradient(50% 90% at 0% 50%, color-mix(in oklab, var(--home) 16%, transparent), transparent), radial-gradient(50% 90% at 100% 50%, color-mix(in oklab, var(--away) 16%, transparent), transparent)",
        }}
      />
      <GoalCelebration trigger={flash.home + flash.away} side={lastSide} team={game[lastSide].shortName} />
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-5 sm:px-8 sm:py-7">
        <TeamBlock game={game} side="home" href={data.teamIds ? `/tym/${data.teamIds.home}` : undefined} />
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 text-5xl font-black tracking-tight tabular sm:text-6xl">
            {started ? (
              <>
                <span key={`h${flash.home}`} className={flash.home ? "goal-pop" : ""}>
                  {game.homeScore}
                </span>
                <span className="text-muted/40">-</span>
                <span key={`a${flash.away}`} className={flash.away ? "goal-pop" : ""}>
                  {game.awayScore}
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold text-muted">{formatTime(game.startAt)}</span>
            )}
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${live ? "text-live" : "text-muted"}`}>
            {live ? <span className="live-dot size-1.5 rounded-full bg-live" /> : null}
            {game.statusLabel}
            {live ? (
              <span className="rounded bg-live/15 px-1.5 py-0.5 text-sm">
                <LiveClock anchor={game.status === "live" ? data.clock : null} fallback={game.clock} />
              </span>
            ) : null}
          </div>
          {game.periods.length > 0 ? (
            <div className="mt-1 flex gap-1.5 text-[11px] text-muted tabular">
              {game.periods.map(([h, a], i) => (
                <span key={i} className="rounded-md bg-surface-2 px-1.5 py-0.5">
                  {h}:{a}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <TeamBlock game={game} side="away" href={data.teamIds ? `/tym/${data.teamIds.away}` : undefined} />
      </div>
    </section>
  );
}

function TeamBlock({ game, side, href }: { game: Game; side: "home" | "away"; href?: string }) {
  const team = game[side];
  const inner = (
    <motion.div
      className="flex flex-col items-center gap-2 text-center"
      initial={{ opacity: 0, x: side === "home" ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <div className="grid size-16 place-items-center rounded-2xl bg-white/95 p-2 shadow-md sm:size-20">
        <TeamLogo team={team} size={56} />
      </div>
      <div className="text-sm font-semibold sm:text-base">{team.shortName}</div>
    </motion.div>
  );
  return href ? (
    <Link href={href} className="transition-transform hover:scale-[1.03]">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rise rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-muted">{title}</h2>
      {children}
    </section>
  );
}

function OddsCard({ pre, live, game }: { pre: Odds1x2 | null; live: Odds1x2 | null; game: Game }) {
  if (!pre && !live) return null;
  const current = live ?? pre!;
  const probs = impliedProbs(current);
  const rows: [string, keyof Odds1x2][] = [
    [game.home.shortName, "home"],
    ["Remíza", "draw"],
    [game.away.shortName, "away"],
  ];
  return (
    <Card title={live ? "Kurzy · živě" : "Kurzy před zápasem"}>
      <div className="space-y-2.5">
        {rows.map(([label, key]) => {
          const p = probs?.[key] ?? 0;
          const before = pre?.[key];
          const now = current[key];
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm">
                <span>{label}</span>
                <span className="flex items-center gap-2 tabular">
                  {live && before && before !== now ? (
                    <span className="text-xs text-muted line-through">{formatOdds(before)}</span>
                  ) : null}
                  <span className="font-semibold">{formatOdds(now)}</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-700"
                  style={{ width: `${p * 100}%` }}
                />
              </div>
              <div className="mt-0.5 text-right text-[11px] text-muted tabular">{formatPct(p)} implikovaně</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3">
        <GamblingNotice compact />
      </div>
    </Card>
  );
}

function BetsCard({ bets, game }: { bets: BetDistribution; game: Game }) {
  const rows = [
    [game.home.shortName, bets.home],
    ["Remíza", bets.draw],
    [game.away.shortName, bets.away],
  ] as const;
  return (
    <Card title="Rozložení sázek">
      <div className="flex h-3 overflow-hidden rounded-full">
        <div className="bg-home" style={{ width: `${bets.home.pct}%` }} />
        <div className="bg-muted/40" style={{ width: `${bets.draw.pct}%` }} />
        <div className="bg-away" style={{ width: `${bets.away.pct}%` }} />
      </div>
      <div className="mt-3 space-y-1.5 text-sm">
        {rows.map(([label, s]) => (
          <div key={label} className="flex items-center justify-between tabular">
            <span>{label}</span>
            <span className="flex items-center gap-3">
              {s.tickets !== null ? <span className="text-xs text-muted">{s.tickets} tiketů</span> : null}
              <span className="font-semibold">{s.pct} %</span>
            </span>
          </div>
        ))}
      </div>
      {bets.topBets.length > 0 ? (
        <>
          <h3 className="mb-1.5 mt-4 text-xs font-semibold text-muted">Nejsázenější tipy</h3>
          <ul className="space-y-1 text-xs">
            {bets.topBets.slice(0, 5).map((b) => (
              <li key={b.name} className="flex justify-between gap-3">
                <span className="truncate">{b.name}</span>
                <span className="shrink-0 tabular text-muted">{formatOdds(b.odds)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Card>
  );
}
