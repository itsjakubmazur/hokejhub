"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, ChartBar, ChartNoAxesColumnIncreasing, CircleDot, ClipboardList, Crosshair, FileText, Grid3x3, Info, ListOrdered, MessageSquareText, Sparkles, Star, Swords, Users } from "lucide-react";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { impliedProbs, pragueDate, type BetDistribution, type Game, type Odds1x2 } from "@hokejhub/core";
import type { GameDetailResponse } from "@/lib/types";
import { formatDayLong, formatOdds, formatPct, formatTime } from "@/lib/format";
import { GamblingNotice } from "./gambling-notice";
import { GoalCelebration } from "./game/goal-celebration";
import { HeadToHead } from "./game/h2h";
import { Insights } from "./game/insights";
import { Commentary } from "./game/commentary";
import { PredictionCard } from "./game/prediction";
import { Recap } from "./game/recap";
import { PeriodSiren } from "./game/period-siren";
import { Faceoffs } from "./game/faceoffs";
import { NhlInfoRows, NhlMatchup, NhlPlayers, SeasonSeries, ThreeStars } from "./game/nhl";
import { ElhPreviewPanel } from "./game/preview";
import { ScoreGrid } from "./game/score-grid";
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
import { Card } from "./ui/card";
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
    { id: "statistiky", label: "Statistiky", show: Boolean(data.periodStats || data.box || data.shots?.length || data.nhl?.rail?.teamStats.length) },
    { id: "sestavy", label: "Sestavy", show: Boolean(data.lineups) },
    { id: "strely", label: "Střely & xG", show: Boolean(data.shots?.length) },
    { id: "hraci", label: "Hráči", show: Boolean(data.playerStats || data.box?.skaters.home.length || data.nhl?.box) },
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

      <AnimatePresence initial={false}>
        <motion.div key={tab} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
          {tab === "prehled" ? <Overview data={data} day={day} /> : null}
          {tab === "prenos" && data.commentary ? (
            <Card title="Textový přenos" icon={MessageSquareText}>
              <Commentary comments={data.commentary} game={game} />
            </Card>
          ) : null}
          {tab === "statistiky" ? (
            <Card title="Statistiky zápasu" icon={ChartBar}>
              <PeriodStats
                game={game}
                stats={data.periodStats}
                box={data.box}
                shots={data.shots}
                rowsByPeriod={data.nhl?.periods?.rows ?? null}
                extraRows={data.nhl?.rail?.teamStats.filter((r) => r.key === "powerPlay").map((r) => ({
                  label: r.label,
                  home: r.home,
                  away: r.away,
                  homeText: r.homeText,
                  awayText: r.awayText,
                  lowerIsBetter: r.key === "pim" || r.key === "giveaways",
                }))}
              />
            </Card>
          ) : null}
          {tab === "statistiky" && (data.faceoffZones || data.playerStats) ? (
            <Card title="Buly" icon={CircleDot} className="mt-4">
              <Faceoffs game={game} zones={data.faceoffZones} stats={data.playerStats} periodStats={data.periodStats} box={data.box} photos={data.photos} />
            </Card>
          ) : null}
          {tab === "sestavy" ? <Lineups game={game} lineups={data.lineups} stats={data.playerStats} box={data.box} photos={data.photos} /> : null}
          {tab === "strely" && data.shots ? <ShotsTab data={data} /> : null}
          {tab === "hraci" ? (
            data.nhl?.box ? (
              <Card title="Statistiky hráčů" icon={Users}>
                <NhlPlayers game={game} box={data.nhl.box} />
              </Card>
            ) : data.playerStats ? (
              <Card title="Statistiky hráčů" icon={Users}>
                <PlayersTable game={game} stats={data.playerStats} box={data.box} photos={data.photos} />
              </Card>
            ) : data.box ? (
              <HokejczBoxScore box={data.box} />
            ) : null
          ) : null}
          {tab === "h2h" && data.teamIds && data.h2h ? (
            <Card title="Vzájemné zápasy" icon={Swords}>
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
        {data.nhl?.extras.threeStars.length ? (
          <Card title="Tři hvězdy zápasu" icon={Star}>
            <ThreeStars stars={data.nhl.extras.threeStars} />
          </Card>
        ) : null}
        {game.status === "scheduled" && data.preview ? (
          <Card title="Před zápasem" icon={ClipboardList}>
            <ElhPreviewPanel game={game} preview={data.preview} />
          </Card>
        ) : null}
        {game.status === "scheduled" && data.nhl?.extras.matchup ? (
          <Card title="Před zápasem" icon={ClipboardList}>
            <NhlMatchup game={game} extras={data.nhl.extras} rail={data.nhl.rail} />
          </Card>
        ) : null}
        {data.box && game.status === "final" ? (
          <Card title="Report" icon={FileText}>
            <Recap box={data.box} xg={xg} homeWinProb={data.prediction?.homeWin ?? null} />
          </Card>
        ) : null}
        {data.insights ? (
          <Card title="Zajímavosti" icon={Sparkles}>
            <Insights game={game} data={data} />
          </Card>
        ) : null}
        {data.prediction && game.status !== "scheduled" ? (
          <Card title="Pravděpodobnost výhry v průběhu zápasu" icon={Activity}>
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
          <Card title="Průběh zápasu" icon={ListOrdered}>
            <Timeline game={game} box={data.box} goals={data.goals} photos={data.photos ?? nhlPhotos(data)} penalties={data.nhl?.extras.penalties} />
          </Card>
        ) : null}
      </div>
      <div className="space-y-4">
        {xg ? (
          <Card title="Očekávané góly (xG)" icon={Crosshair}>
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
          <Card title={game.status === "scheduled" ? "Predikce" : "Predikce před zápasem"} icon={ChartNoAxesColumnIncreasing}>
            <PredictionCard game={game} prediction={data.prediction} odds={game.preOdds} />
          </Card>
        ) : null}
        {data.prediction && game.status === "scheduled" ? (
          <Card title="Nejpravděpodobnější výsledky" icon={Grid3x3}>
            <ScoreGrid expHome={data.prediction.expHome} expAway={data.prediction.expAway} homeLabel={game.home.abbrev} awayLabel={game.away.abbrev} />
          </Card>
        ) : null}
        {data.nhl?.rail?.seasonSeries.length ? (
          <Card title="Vzájemné zápasy v sezóně" icon={Swords}>
            <SeasonSeries rail={data.nhl.rail} game={game} />
          </Card>
        ) : null}
        {game.preOdds || data.liveOdds ? <OddsCard pre={game.preOdds} live={isLive(game) ? data.liveOdds : null} game={game} /> : null}
        <Card title="Informace" icon={Info}>
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
            {data.nhl ? <NhlInfoRows rail={data.nhl.rail} extras={data.nhl.extras} game={game} /> : null}
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


function MatchHeader({ game, data, day }: { game: Game; data: GameDetailResponse; day: string }) {
  const flash = useGoalFlash(game.homeScore, game.awayScore);
  const pathname = usePathname();
  const started = game.homeScore !== null;
  const live = isLive(game);
  const lastSide = flash.home + flash.away === 0 ? "home" : flash.home >= flash.away ? "home" : "away";
  const sog =
    data.box?.teamStats["Střely na branku"] ??
    (data.shots?.length
      ? ([
          data.shots.filter((x) => x.teamId === game.home.id && (x.type === "shot-on-goal" || x.type === "goal")).length,
          data.shots.filter((x) => x.teamId !== game.home.id && (x.type === "shot-on-goal" || x.type === "goal")).length,
        ] as [number, number])
      : null);
  const periodCols = Math.max(3, game.periods.length);
  return (
    <section className="relative overflow-hidden bg-board text-board-text">
      <div className="flex items-center justify-between gap-3 border-b border-board-line px-4 py-2.5">
        <Link href={day === pragueDate() ? "/" : `/?date=${day}`} className="label min-w-0 truncate text-board-muted hover:text-board-text">
          ← {game.leagueName}
          {data.box?.round ? ` · ${data.box.round}` : ""}
        </Link>
        <span className="flex shrink-0 items-center gap-3 text-xs text-board-muted">
          <span className="hidden tabular sm:inline">
            {new Intl.DateTimeFormat("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", year: "numeric" }).format(new Date(game.startAt))}{" "}
            {formatTime(game.startAt)}
          </span>
          <ShareButton
            title={`${game.home.shortName} ${started ? `${game.homeScore}:${game.awayScore}` : "vs"} ${game.away.shortName}`}
            image={`/api/og${pathname}?d=${day}`}
          />
        </span>
      </div>
      <GoalCelebration trigger={flash.home + flash.away} side={lastSide} team={game[lastSide].shortName} />
      <PeriodSiren game={game} />
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-start gap-2 px-3 pb-5 pt-6 sm:px-8">
        <TeamBlock game={game} side="home" href={data.teamIds ? `/tym/${data.teamIds.home}` : undefined} />
        <div className="flex flex-col items-center">
          {started ? (
            <div className="flex items-stretch gap-1.5">
              {(["home", "away"] as const).map((side) => (
                <span
                  key={`${side}${flash[side]}`}
                  className={`led grid min-w-[1.35em] place-items-center bg-board-2 px-2 text-6xl leading-none sm:text-7xl ${flash[side] ? "goal-pop" : ""}`}
                  style={{ paddingBlock: "0.12em" }}
                >
                  {side === "home" ? game.homeScore : game.awayScore}
                </span>
              ))}
            </div>
          ) : (
            <span className="led bg-board-2 px-3 py-1 text-5xl">{formatTime(game.startAt)}</span>
          )}
          <div className={`label mt-3 flex items-center gap-2 ${live ? "text-live" : "text-board-muted"}`}>
            {live ? <span className="live-dot size-2 rounded-full bg-live" /> : null}
            {game.statusLabel}
            {live ? (
              <span className="led text-xl" style={{ color: "var(--live)", textShadow: "0 0 12px color-mix(in oklab, var(--live) 45%, transparent)" }}>
                <LiveClock anchor={game.status === "live" ? data.clock : null} fallback={game.clock} />
              </span>
            ) : null}
          </div>
        </div>
        <TeamBlock game={game} side="away" href={data.teamIds ? `/tym/${data.teamIds.away}` : undefined} />
      </div>
      {started && (game.periods.length > 0 || sog) ? (
        <div className="overflow-x-auto border-t border-board-line">
          <table className="mx-auto text-center tabular">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-[0.12em] text-board-muted">
                <th className="px-3 pt-2 text-left font-semibold">Třetina</th>
                {Array.from({ length: periodCols }, (_, i) => (
                  <th key={i} className="w-9 pt-2 font-semibold">
                    {i < 3 ? i + 1 : i === 3 ? "PP" : "SN"}
                  </th>
                ))}
                {sog ? <th className="pl-4 pr-3 pt-2 font-semibold">Střely</th> : null}
              </tr>
            </thead>
            <tbody className="display text-lg">
              {(["home", "away"] as const).map((side, si) => (
                <tr key={side}>
                  <td className="px-3 text-left font-sans text-xs font-semibold text-board-muted">{game[side].abbrev}</td>
                  {Array.from({ length: periodCols }, (_, i) => (
                    <td key={i} className={`w-9 ${game.periods[i] ? "text-board-text" : "text-board-muted/40"}`}>
                      {game.periods[i] ? game.periods[i]![si] : "–"}
                    </td>
                  ))}
                  {sog ? <td className="led pl-4 pr-3">{sog[si]}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="h-2" />
        </div>
      ) : null}
    </section>
  );
}

function TeamBlock({ game, side, href }: { game: Game; side: "home" | "away"; href?: string }) {
  const team = game[side];
  const inner = (
    <motion.div
      className="flex flex-col items-center gap-2.5 text-center"
      initial={{ opacity: 0, x: side === "home" ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <div className="grid size-20 place-items-center bg-white p-2 sm:size-32 sm:p-3">
        <TeamLogo team={team} size={104} className="!size-full" />
      </div>
      <div className="display text-xl leading-none sm:text-3xl">{team.shortName}</div>
      <div className={`h-[3px] w-8 ${side === "home" ? "bg-home" : "bg-away"}`} aria-hidden />
    </motion.div>
  );
  return href ? (
    <Link href={href} className="transition-opacity hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
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

/** NHL headshots keyed like goal scorer ids (`nhl-{playerId}`). */
function nhlPhotos(data: GameDetailResponse): Record<string, string> | null {
  const box = data.nhl?.box;
  if (!box) return null;
  const out: Record<string, string> = {};
  for (const p of [...box.skaters.home, ...box.skaters.away, ...box.goalies.home, ...box.goalies.away]) out[`nhl-${p.id}`] = p.headshot;
  for (const p of [...box.skaters.home, ...box.skaters.away]) out[String(p.id)] = p.headshot;
  return out;
}
