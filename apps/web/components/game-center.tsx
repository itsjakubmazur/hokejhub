"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Award,
  ChartBar,
  Gauge,
  Shield,
  Waves,
  ChartNoAxesColumnIncreasing,
  CircleDot,
  ClipboardList,
  Crosshair,
  FileText,
  Grid3x3,
  Info,
  ListOrdered,
  Sparkles,
  Star,
  Swords,
  Users,
} from "lucide-react";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ShotDanger } from "./game/danger";
import { BestPlayers, GoalieDuel, MatchInfo } from "./game/goalies";
import { Momentum, type MomentumPenalty } from "./game/momentum";
import { PreviewGoalies, PreviewPlayers, PreviewTeams } from "./game/preview-pro";
import { Segmented } from "./game/segmented";
import { InfoButton } from "./game/versus";
import { WinGauge } from "./game/win-gauge";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { addDays, CS, csCount, impliedProbs, pragueDate, type BetDistribution, type FormResult, type Game, type Odds1x2 } from "@hokejhub/core";
import type { TeamCard } from "@/lib/server/team-card";
import { imgSrc } from "@/lib/img";
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
import { Expectations } from "./game/expectations";
import { WinProbability } from "./game/win-probability";
import { LiveClock } from "./game/live-clock";
import { Lineups } from "./game/lineups";
import { PeriodStats } from "./game/period-stats";
import { PlayersTable } from "./game/players-table";
import { Timeline } from "./game/timeline";
import { XgFlow } from "./game/xg-flow";
import { HokejczBoxScore } from "./hokejcz-box";
import { ShotMap } from "./shot-map";
import { SourceStatus } from "./source-status";
import { TeamLogo } from "./team-logo";
import { PlayerPhoto } from "./player-photo";
import { ShareButton } from "./share-button";
import { Card } from "./ui/card";
import { useGoalFlash } from "./use-goal-flash";

const isLive = (g: Game) => g.status === "live" || g.status === "intermission";

type Tab = "prehled" | "prubeh" | "statistiky" | "sestavy" | "strely" | "vyvoj" | "hraci" | "h2h" | "kurzy";

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
  // An NHL game is listed under its North American date (tonight) and again the next Prague
  // day (as a result); the back link goes to whichever fits its state.
  const day =
    game.source === "nhl"
      ? addDays(new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(game.startAt)), game.status === "final" ? 1 : 0)
      : pragueDate(new Date(game.startAt));

  const live = isLive(game);
  const scheduled = game.status === "scheduled";
  const hasTimeline = !scheduled && Boolean(data.box?.goals.length || data.box?.penalties.length || data.goals?.length);
  // Tab order follows what matters in each state: events first while it's on, the report once it's
  // over, the matchup before it starts. Everything stays reachable; only the order changes.
  const all: Record<Tab, { label: string; show: boolean }> = {
    prehled: { label: "Přehled", show: true },
    prubeh: { label: "Průběh", show: hasTimeline || Boolean(data.commentary?.length) },
    statistiky: {
      label: "Statistiky",
      show: !scheduled && Boolean(data.periodStats || data.box || data.shots?.length || data.nhl?.rail?.teamStats.length),
    },
    strely: { label: "Střely", show: Boolean(data.shots?.length) },
    sestavy: { label: "Sestavy", show: Boolean(data.lineups) },
    hraci: { label: "Hráči", show: !scheduled && Boolean(data.playerStats || data.box?.skaters.home.length || data.nhl?.box) },
    vyvoj: { label: "Vývoj", show: !scheduled && Boolean(data.prediction || data.shots?.length) },
    h2h: { label: "H2H", show: Boolean((data.teamIds && data.h2h) || data.preview || data.nhl?.rail?.seasonSeries.length) },
    kurzy: { label: "Kurzy", show: Boolean(game.preOdds || data.liveOdds || data.bets) },
  };
  const order: Tab[] = scheduled
    ? ["prehled", "h2h", "sestavy", "prubeh", "kurzy"]
    : live
      ? ["prehled", "prubeh", "statistiky", "strely", "sestavy", "hraci", "vyvoj", "h2h", "kurzy"]
      : ["prehled", "prubeh", "statistiky", "strely", "hraci", "sestavy", "vyvoj", "h2h", "kurzy"];
  const tabs = order.map((id) => ({ id, ...all[id] }));
  const visible = tabs.filter((t) => t.show);

  // Compact score bar once the big board has scrolled away.
  const boardRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCompact(!e!.isIntersecting), { rootMargin: "-120px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
    <div className="space-y-2.5 sm:space-y-3">
      <div ref={boardRef}>
        <MatchHeader game={game} data={data} day={day} />
      </div>
      <SourceStatus sources={data.sources} />

      <div className="sticky top-14 z-20 -mx-3 border-b border-line bg-bg/85 backdrop-blur-xl sm:mx-0">
        <AnimatePresence initial={false}>
          {compact ? (
            <motion.div
              key="compact"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative overflow-hidden"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-home/25 via-transparent to-away/25" aria-hidden />
              <div className="relative flex items-center gap-3 px-4 py-2">
                <Link href={day === pragueDate() ? "/" : `/?date=${day}`} aria-label="Zpět na zápasy" className="text-muted hover:text-fg">
                  ←
                </Link>
                <div className="flex flex-1 items-center justify-center gap-2.5">
                  <span className="display text-lg">{game.home.abbrev}</span>
                  <TeamLogo team={game.home} size={28} />
                  <span className={`display min-w-16 text-center text-2xl tabular ${isLive(game) ? "text-live" : ""}`}>
                    {game.homeScore !== null ? `${game.homeScore}:${game.awayScore}` : formatTime(game.startAt)}
                  </span>
                  <TeamLogo team={game.away} size={28} />
                  <span className="display text-lg">{game.away.abbrev}</span>
                </div>
                <span className="w-4" aria-hidden />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <nav className="no-scrollbar flex gap-0.5 overflow-x-auto px-2 sm:gap-1 sm:px-0">
          {visible.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative shrink-0 px-2.5 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors sm:px-3 sm:py-3 sm:text-sm ${
                tab === t.id ? "text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {t.label}
              {tab === t.id ? <motion.span layoutId="game-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-live" /> : null}
            </button>
          ))}
        </nav>
      </div>

      <AnimatePresence initial={false}>
        <motion.div key={tab} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
          {tab === "prehled" ? <Overview data={data} day={day} /> : null}
          {tab === "prubeh" ? <ProgressTab data={data} /> : null}
          {tab === "statistiky" ? (
            <div className="space-y-3 sm:space-y-4">
              <Card title="Statistiky zápasu" icon={ChartBar}>
                <PeriodStats
                  game={game}
                  stats={data.periodStats}
                  box={data.box}
                  shots={data.shots}
                  rowsByPeriod={data.nhl?.periods?.rows ?? null}
                  extraRows={data.nhl?.rail?.teamStats
                    .filter((r) => r.key === "powerPlay")
                    .map((r) => ({
                      label: r.label,
                      home: r.home,
                      away: r.away,
                      homeText: r.homeText,
                      awayText: r.awayText,
                      lowerIsBetter: r.key === "pim" || r.key === "giveaways",
                    }))}
                />
              </Card>
              {data.box && data.box.goalies.home.length && data.box.goalies.away.length ? (
                <Card title="Statistiky brankářů" icon={Shield} action={<GsaxInfo />}>
                  <GoalieDuel game={game} box={data.box} shots={data.shots} photos={data.photos} />
                </Card>
              ) : null}
              {data.faceoffZones || data.playerStats ? (
                <Card title="Buly" icon={CircleDot}>
                  <Faceoffs game={game} zones={data.faceoffZones} stats={data.playerStats} periodStats={data.periodStats} box={data.box} photos={data.photos} />
                </Card>
              ) : null}
            </div>
          ) : null}
          {tab === "sestavy" ? <Lineups game={game} lineups={data.lineups} stats={data.playerStats} box={data.box} photos={data.photos} /> : null}
          {tab === "strely" && data.shots ? <ShotsTab data={data} /> : null}
          {tab === "vyvoj" ? <DevelopmentTab data={data} /> : null}
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
          {tab === "h2h" ? (
            <div className="space-y-3 sm:space-y-4">
              {data.preview ? (
                <>
                  {game.status !== "scheduled" ? (
                    <Card title="Týmy před zápasem" icon={ClipboardList}>
                      <PreviewTeams game={game} preview={data.preview} />
                    </Card>
                  ) : null}
                  <Card title="H2H hráči" icon={Users}>
                    <PreviewPlayers preview={data.preview} />
                  </Card>
                  {data.preview.home.goalie && data.preview.away.goalie ? (
                    <Card title="H2H brankáři" icon={Shield}>
                      <PreviewGoalies preview={data.preview} />
                    </Card>
                  ) : null}
                </>
              ) : null}
              {data.nhl?.rail?.seasonSeries.length ? (
                <Card title="Vzájemné zápasy v sezóně" icon={Swords}>
                  <SeasonSeries rail={data.nhl.rail} game={game} />
                </Card>
              ) : null}
              {data.teamIds && data.h2h ? (
                <Card title="Vzájemné zápasy" icon={Swords}>
                  <HeadToHead game={game} games={data.h2h} teamIds={data.teamIds} />
                </Card>
              ) : null}
            </div>
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

function GsaxInfo() {
  return (
    <InfoButton title="Góly chycené nad očekávání">
      <p>
        Součet xG všech neblokovaných střel, které brankář dostal, minus góly, které inkasoval. Kladné číslo znamená, že chytil víc, než by podle
        kvality střel chytil průměrný brankář.
      </p>
      <p>Střely se brankářům přiřazují podle času stráveného v brance.</p>
    </InfoButton>
  );
}

/** Timeline and the text feed side by side under one tab. */
function ProgressTab({ data }: { data: GameDetailResponse }) {
  const { game } = data;
  const [view, setView] = useState<"udalosti" | "prenos">(game.status === "scheduled" || !data.box?.goals.length ? "prenos" : "udalosti");
  const hasEvents = Boolean(data.box?.goals.length || data.box?.penalties.length || data.goals?.length);
  const hasFeed = Boolean(data.commentary?.length);
  return (
    <Card
      title="Průběh zápasu"
      icon={ListOrdered}
      action={
        hasEvents && hasFeed ? (
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "udalosti", label: "Události" },
              { value: "prenos", label: "Textový přenos" },
            ]}
          />
        ) : undefined
      }
    >
      {view === "udalosti" && hasEvents ? (
        <Timeline game={game} box={data.box} goals={data.goals} photos={data.photos ?? nhlPhotos(data)} penalties={data.nhl?.extras.penalties} />
      ) : data.commentary ? (
        <Commentary comments={data.commentary} game={game} />
      ) : (
        <Timeline game={game} box={data.box} goals={data.goals} photos={data.photos ?? nhlPhotos(data)} penalties={data.nhl?.extras.penalties} />
      )}
    </Card>
  );
}

function xgTotals(data: GameDetailResponse): [number, number] | null {
  const { game } = data;
  if (!data.shots?.some((s) => s.xg !== undefined)) return null;
  return [
    data.shots.filter((s) => s.teamId === game.home.id).reduce((a, s) => a + (s.xg ?? 0), 0),
    data.shots.filter((s) => s.teamId !== game.home.id).reduce((a, s) => a + (s.xg ?? 0), 0),
  ];
}

function XgCard({ data }: { data: GameDetailResponse }) {
  const xg = xgTotals(data);
  if (!xg) return null;
  const { game } = data;
  return (
    <Card title="xG" icon={Crosshair}>
      <div className="flex items-end justify-between">
        <BigNumber value={xg[0]} side="home" label={game.home.shortName} />
        <span className="pb-2 text-xs text-muted">vs</span>
        <BigNumber value={xg[1]} side="away" label={game.away.shortName} />
      </div>
      {data.shots?.length ? (
        <div className="mt-3 border-t border-line pt-3">
          <div className="label mb-1 text-[10px] text-muted">Vývoj zápasu</div>
          <Momentum game={game} shots={data.shots} goals={goalMoments(data)} penalties={momentumPenalties(data)} compact />
        </div>
      ) : null}
    </Card>
  );
}

function InfoCard({ data, day }: { data: GameDetailResponse; day: string }) {
  const { game } = data;
  return (
    <Card title="Informace" icon={Info}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
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
        {data.box?.round ? (
          <>
            <dt className="text-muted">Kolo</dt>
            <dd>{data.box.round}</dd>
          </>
        ) : null}
        {data.nhl ? <NhlInfoRows rail={data.nhl.rail} extras={data.nhl.extras} game={game} /> : null}
      </dl>
    </Card>
  );
}

/**
 * Overview per state. Before the game: who's favoured and how the teams compare. While it's on:
 * the live pulse (win chance, last events, live odds). After: the report and the standouts.
 * Detail lives in the tabs; the overview stays short enough for one or two phone screens.
 */
function Overview({ data, day }: { data: GameDetailResponse; day: string }) {
  const { game } = data;
  const live = isLive(game);
  const scheduled = game.status === "scheduled";
  const xg = xgTotals(data);
  const odds = game.preOdds || data.liveOdds ? <OddsCard pre={game.preOdds} live={live ? data.liveOdds : null} game={game} /> : null;
  const insights = data.insights ? (
    <Card title={scheduled ? "Na koho se dívat" : "Zajímavosti"} icon={Sparkles}>
      <Insights game={game} data={data} />
    </Card>
  ) : null;
  // Without a hokej.cz box score there is no report, no standouts and no insights (three stars
  // alone are a headline, not a story); the timeline then belongs on the first screen.
  const sparse = !((game.status === "final" && data.box) || data.insights);
  const hasEvents = Boolean(data.box?.goals.length || data.box?.penalties.length || data.goals?.length);
  const timelineCard = (recent?: number) =>
    hasEvents ? (
      <Card title={recent ? "Poslední události" : "Průběh zápasu"} icon={ListOrdered}>
        <Timeline game={game} box={data.box} goals={data.goals} photos={data.photos ?? nhlPhotos(data)} penalties={data.nhl?.extras.penalties} recent={recent} />
      </Card>
    ) : null;
  const prediction = data.prediction ? (
    <Card title={scheduled ? "Predikce" : "Predikce před zápasem"} icon={ChartNoAxesColumnIncreasing}>
      <PredictionCard game={game} prediction={data.prediction} odds={game.preOdds} />
    </Card>
  ) : null;

  if (scheduled) {
    return (
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3 sm:space-y-4">
          {data.prediction ? (
            <Card title="Výhrometr" icon={Gauge} action={<WinInfo />}>
              <WinGauge game={game} homeWin={data.prediction.homeWin} />
            </Card>
          ) : null}
          {data.preview ? (
            <Card title="H2H týmy" icon={ClipboardList}>
              <PreviewTeams game={game} preview={data.preview} />
            </Card>
          ) : null}
          {data.nhl?.extras.matchup ? (
            <Card title="Před zápasem" icon={ClipboardList}>
              <NhlMatchup game={game} extras={data.nhl.extras} rail={data.nhl.rail} />
            </Card>
          ) : null}
          {insights}
        </div>
        <div className="space-y-3 sm:space-y-4">
          {prediction}
          {data.prediction ? (
            <Card title="Co čekat od zápasu" icon={Grid3x3}>
              <Expectations expHome={data.prediction.expHome} expAway={data.prediction.expAway} homeLabel={game.home.shortName} awayLabel={game.away.shortName} />
            </Card>
          ) : null}
          {odds}
          <InfoCard data={data} day={day} />
        </div>
      </div>
    );
  }

  if (live) {
    return (
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3 sm:space-y-4">
          {data.prediction ? (
            <Card title="Šance na výhru teď" icon={Activity}>
              <WinProbability game={game} goals={goalMoments(data)} expHome={data.prediction.expHome} expAway={data.prediction.expAway} elapsedNow={elapsedNow(data)} />
            </Card>
          ) : null}
          {timelineCard(sparse ? undefined : 6)}
          {insights}
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className={`grid gap-3 sm:gap-4 lg:grid-cols-1 ${xg && prediction ? "grid-cols-2" : ""}`}>
            {xg ? <XgCard data={data} /> : null}
            {prediction}
          </div>
          {odds}
          {data.box && (data.box.attendance || data.box.referees.length) ? (
            <Card title="Zápasové info" icon={Info}>
              <MatchInfo box={data.box} />
            </Card>
          ) : null}
          <InfoCard data={data} day={day} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3 sm:space-y-4">
        {data.box ? (
          <Card title="Report" icon={FileText}>
            <Recap box={data.box} xg={xg} homeWinProb={data.prediction?.homeWin ?? null} />
          </Card>
        ) : null}
        {data.nhl?.extras.threeStars.length ? (
          <Card title="Tři hvězdy zápasu" icon={Star}>
            <ThreeStars stars={data.nhl.extras.threeStars} />
          </Card>
        ) : null}
        {data.box ? (
          <Card title="Nejlepší hráči zápasu" icon={Award}>
            <BestPlayers box={data.box} photos={data.photos} />
          </Card>
        ) : null}
        {sparse ? timelineCard() : null}
        {insights}
      </div>
      <div className="space-y-3 sm:space-y-4">
        <div className={`grid gap-3 sm:gap-4 lg:grid-cols-1 ${xg && prediction ? "grid-cols-2" : ""}`}>
          {xg ? <XgCard data={data} /> : null}
          {prediction}
        </div>
        {data.box && (data.box.attendance || data.box.referees.length) ? (
          <Card title="Zápasové info" icon={Info}>
            <MatchInfo box={data.box} />
          </Card>
        ) : null}
        {odds}
        <InfoCard data={data} day={day} />
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
      <motion.div className="text-3xl font-bold tabular" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
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

function WinInfo() {
  return (
    <InfoButton title="Výhrometr">
      <p>
        Pravděpodobnost výhry včetně prodloužení a nájezdů podle našeho modelu: Elo síla obou týmů z celé historie extraligy, převedená na očekávané
        góly a Poissonovo rozdělení.
      </p>
    </InfoButton>
  );
}

/** Penalties that put the other team on a power play, as elapsed-time windows. */
function momentumPenalties(data: GameDetailResponse): MomentumPenalty[] {
  const len = (m: number | null) => (m === 2 ? 120 : m === 4 ? 240 : m === 5 ? 300 : 0);
  if (data.box) {
    return data.box.penalties
      .map((p) => ({
        start: clockSeconds(p.time) ?? -1,
        length: len(p.minutes),
        side: p.team === data.box!.home.abbrev ? ("home" as const) : ("away" as const),
      }))
      .filter((p) => p.start >= 0 && p.length > 0);
  }
  return (data.nhl?.extras.penalties ?? [])
    .map((p) => ({
      start: (p.period - 1) * 1200 + (clockSeconds(p.time) ?? 0),
      length: len(p.minutes),
      side: p.team === data.game.home.abbrev ? ("home" as const) : ("away" as const),
    }))
    .filter((p) => p.length > 0);
}

function DevelopmentTab({ data }: { data: GameDetailResponse }) {
  const { game } = data;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        {data.prediction ? (
          <Card title="Výhrometr" icon={Gauge} action={<WinInfo />}>
            <WinGauge game={game} homeWin={data.prediction.homeWin} />
          </Card>
        ) : null}
        {data.prediction && game.status !== "scheduled" ? (
          <Card title="Šance na výhru během zápasu" icon={Activity}>
            <WinProbability
              game={game}
              goals={goalMoments(data)}
              expHome={data.prediction.expHome}
              expAway={data.prediction.expAway}
              elapsedNow={game.status === "final" ? 3600 : elapsedNow(data)}
            />
          </Card>
        ) : null}
      </div>
      {data.shots?.length && game.status !== "scheduled" ? (
        <Card
          title="Vývoj zápasu"
          icon={Waves}
          action={
            <InfoButton title="Vývoj zápasu">
              <p>
                Graf ukazuje, který tým měl v každé minutě střeleckou převahu a jak výraznou. Každý pokus se váží podle nebezpečnosti (xG) a vyhlazuje
                přes okolní minuty.
              </p>
              <p>Písmeno G označuje góly, šedé pásy vyloučení – proužek na kraji ukazuje, který tým byl v oslabení.</p>
            </InfoButton>
          }
        >
          <Momentum game={game} shots={data.shots} goals={goalMoments(data)} penalties={momentumPenalties(data)} />
        </Card>
      ) : null}
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
        {hasXg ? (
          <Card
            title="Střely a nebezpečnost"
            icon={Crosshair}
            action={
              <InfoButton title="Nebezpečnost střel">
                <p>Všechny střelecké pokusy (na branku, mimo i zblokované) a součet jejich xG, tedy kolik gólů by z nich průměrně padlo.</p>
                <p>
                  Nebezpečnost podle šance jednotlivé střely: vysoká od 12 % (dorážky, střely z brankoviště), střední 4–12 % (slot, kruhy), nízká pod
                  4 % (střely od modré a z ostrých úhlů). Zblokované střely do pásem nepočítáme.
                </p>
              </InfoButton>
            }
          >
            <ShotDanger game={game} shots={shots} />
          </Card>
        ) : null}
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
                    <span className="text-xs text-muted">
                      {" "}
                      · {p.shots} stř. · {p.goals} G
                    </span>
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
            {new Intl.DateTimeFormat("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", year: "numeric" }).format(
              new Date(game.startAt),
            )}{" "}
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
      <BoardCrests game={game} />
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 px-3 pb-5 pt-6 sm:px-8">
        <TeamBlock game={game} side="home" card={data.teamCards?.home ?? null} href={data.teamIds ? `/tym/${data.teamIds.home}` : undefined} />
        <div className="flex flex-col items-center">
          <div className="relative">
            {/* Faceoff: the puck drops on the centre dot, then the board lights up. */}
            <span
              className="faceoff-dot pointer-events-none absolute left-1/2 top-1/2 -ml-3 -mt-3 size-6 rounded-full border-2 border-live"
              aria-hidden
            />
            <span
              className="faceoff-puck pointer-events-none absolute left-1/2 top-1/2 z-10 -ml-3 -mt-1.5 h-3 w-6 rounded-[50%] bg-black ring-1 ring-board-line"
              aria-hidden
            />
            {started ? (
              <div className="led-on flex items-stretch gap-1.5" style={{ animationDelay: "0.55s" }}>
                {(["home", "away"] as const).map((side) => (
                  <span
                    key={`${side}${flash[side]}`}
                    className={`led grid min-w-[1.3em] place-items-center bg-board-2 px-1.5 text-5xl leading-none sm:px-2 sm:text-7xl ${flash[side] ? "goal-pop led-flip" : ""}`}
                    style={{ paddingBlock: "0.12em" }}
                  >
                    {side === "home" ? game.homeScore : game.awayScore}
                  </span>
                ))}
              </div>
            ) : (
              <span className="led-on led block bg-board-2 px-3 py-1 text-5xl" style={{ animationDelay: "0.55s" }}>
                {formatTime(game.startAt)}
              </span>
            )}
          </div>
          {!started && game.status === "scheduled" ? <FaceoffCountdown startAt={game.startAt} /> : null}
          <CenterFacts game={game} data={data} />
          <div className={`label mt-3 flex items-center gap-2 ${live ? "text-live" : "text-board-muted"}`}>
            {live ? <span className="live-dot size-2 rounded-full bg-live" /> : null}
            {game.statusLabel}
            {live ? (
              <span
                className="led text-xl"
                style={{ color: "var(--live)", textShadow: "0 0 12px color-mix(in oklab, var(--live) 45%, transparent)" }}
              >
                <LiveClock anchor={game.status === "live" ? data.clock : null} fallback={game.clock} />
              </span>
            ) : null}
          </div>
        </div>
        <TeamBlock game={game} side="away" card={data.teamCards?.away ?? null} href={data.teamIds ? `/tym/${data.teamIds.away}` : undefined} />
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

/** xG, venue and crowd under the score — the centre of the board on wide screens. */
function CenterFacts({ game, data }: { game: Game; data: GameDetailResponse }) {
  const hasXg = data.shots?.some((x) => x.xg !== undefined);
  const xg = hasXg
    ? [
        data.shots!.filter((x) => x.teamId === game.home.id).reduce((a, x) => a + (x.xg ?? 0), 0),
        data.shots!.filter((x) => x.teamId !== game.home.id).reduce((a, x) => a + (x.xg ?? 0), 0),
      ]
    : null;
  const venue = data.box?.venue ?? null;
  const crowd = data.box?.attendance ?? null;
  if (!xg && !venue && !crowd) return null;
  return (
    <motion.dl
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="mt-4 hidden flex-col items-center gap-1 text-[11px] text-board-muted sm:flex"
    >
      {xg ? (
        <div className="flex items-baseline gap-2">
          <dt className="label text-[10px]">xG</dt>
          <dd className="display text-lg text-board-text tabular">
            {xg[0]!.toFixed(2)} <span className="text-board-muted">:</span> {xg[1]!.toFixed(2)}
          </dd>
        </div>
      ) : null}
      {venue ? <dd className="max-w-56 truncate">{venue}</dd> : null}
      {crowd ? <dd className="tabular">{csCount(crowd, CS.divak)}</dd> : null}
    </motion.dl>
  );
}

/** LED countdown to the opening faceoff (shown within 48 hours of it). */
function FaceoffCountdown({ startAt }: { startAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Date.parse(startAt) - now);
  if (left === 0 || left > 48 * 3600_000) return null;
  const s = Math.floor(left / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="mt-3 flex flex-col items-center">
      <span className="label text-[10px] text-board-muted">do vhazování</span>
      <span className="led mt-1 text-2xl tabular" style={{ color: "var(--led)" }}>
        {pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}
      </span>
    </div>
  );
}

/** Both clubs' crests blown up behind the scoreboard, one per side, with a wash of the side colour. */
function BoardCrests({ game }: { game: Game }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-home/15 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-away/15 to-transparent" />
      {(["home", "away"] as const).map((side) =>
        game[side].logoUrl ? (
          <motion.img
            key={side}
            src={imgSrc(game[side].logoUrl)!}
            alt=""
            initial={{ opacity: 0, scale: 1.25, x: side === "home" ? -80 : 80 }}
            animate={{ opacity: 0.1, scale: 1, x: 0 }}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
            className={`absolute top-1/2 size-[22rem] -translate-y-1/2 object-contain grayscale-[30%] sm:size-[30rem] ${
              side === "home" ? "-left-24 -rotate-12 sm:-left-20" : "-right-24 rotate-12 sm:-right-20"
            }`}
          />
        ) : null,
      )}
    </div>
  );
}

const FORM_CHIP: Record<FormResult, string> = {
  W: "bg-win text-white",
  OTW: "bg-win/60 text-white",
  T: "bg-board-muted/50 text-board-text",
  OTL: "bg-live/60 text-white",
  L: "bg-live text-white",
};
const FORM_LETTER: Record<FormResult, string> = { W: "V", OTW: "VP", T: "R", OTL: "PP", L: "P" };

function TeamBlock({ game, side, href, card }: { game: Game; side: "home" | "away"; href?: string; card: TeamCard | null }) {
  const team = game[side];
  const inner = (
    <motion.div
      className="flex w-full flex-col items-center gap-2.5 text-center"
      initial={{ opacity: 0, x: side === "home" ? -60 : 60, rotate: side === "home" ? -6 : 6 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 }}
    >
      <div className="grid size-16 place-items-center bg-white p-1.5 shadow-[0_10px_40px_rgb(0_0_0/0.45)] sm:size-32 sm:p-3">
        <TeamLogo team={team} size={104} className="!size-full" />
      </div>
      <div className="display w-full truncate text-lg leading-none sm:text-3xl">{team.shortName}</div>
      <div className={`h-[3px] w-8 ${side === "home" ? "bg-home" : "bg-away"}`} aria-hidden />
    </motion.div>
  );
  return (
    <div className="flex min-w-0 flex-col items-center">
      {href ? (
        <Link href={href} className="w-full transition-opacity hover:opacity-80">
          {inner}
        </Link>
      ) : (
        inner
      )}
      {card ? <TeamCardInfo card={card} side={side} /> : null}
    </div>
  );
}

/** Table position, points, form and record under a team in the header. */
function TeamCardInfo({ card, side }: { card: TeamCard; side: "home" | "away" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.35 }}
      className="mt-3 flex flex-col items-center gap-1.5 text-center"
    >
      <div className="flex flex-wrap items-baseline justify-center gap-x-1.5">
        <span className="led text-2xl sm:text-3xl" style={{ color: "var(--led)" }}>
          {card.rank}.
        </span>
        <span className="text-[11px] text-board-muted">
          <span className="hidden sm:inline">{card.scope} · </span>
          {card.pts} b.
        </span>
      </div>
      {card.form?.length ? (
        <div className={`flex gap-0.5 ${side === "home" ? "" : ""}`} title="Forma, poslední zápas vlevo">
          {card.form.map((f, i) => (
            <span
              key={i}
              className={`grid h-4 min-w-4 place-items-center px-0.5 text-[8px] font-bold sm:h-5 sm:min-w-5 sm:text-[9px] ${FORM_CHIP[f]}`}
            >
              {FORM_LETTER[f]}
            </span>
          ))}
        </div>
      ) : null}
      <div className="hidden text-[11px] text-board-muted tabular sm:block">
        {csCount(card.gp, CS.zapas)} · skóre {card.gf}:{card.ga}
        {card.last10 ? ` · posl. 10: ${card.last10}` : ""}
        {card.streak ? ` · série ${card.streak}` : ""}
      </div>
    </motion.div>
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
                  {live && before && before !== now ? <span className="text-xs text-muted line-through">{formatOdds(before)}</span> : null}
                  <span className="font-semibold">{formatOdds(now)}</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${p * 100}%` }} />
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
