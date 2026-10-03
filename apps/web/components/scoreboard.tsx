"use client";

import { ChevronRight, Star } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { addDays, DEFAULT_LEAGUES, getLeague, pragueDate, type Game } from "@hokejhub/core";
import type { ScoreboardResponse } from "@/lib/types";
import { isFavoriteTeam, useFavorites } from "@/lib/favorites";
import { formatDayLong, formatDayShort } from "@/lib/format";
import { GameRow } from "./game-row";
import { GamblingNotice } from "./gambling-notice";
import { SourceStatus } from "./source-status";
import { CS, csCount } from "@hokejhub/core";

const isLive = (g: Game) => g.status === "live" || g.status === "intermission";

async function fetchScoreboard(date: string): Promise<ScoreboardResponse> {
  try {
    const res = await fetch(`/api/scoreboard?date=${date}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    // Our server is unreachable: eSports JSON sends `Access-Control-Allow-Origin: *`, so the
    // browser can read it directly (Czech leagues + NHL from eSports, no official NHL data).
    const fallback = await fetchScoreboardFromBrowser(date).catch(() => null);
    if (fallback) return fallback;
    throw e;
  }
}

async function fetchScoreboardFromBrowser(date: string): Promise<ScoreboardResponse> {
  // Loaded only when our server is down, so the feed parsers (and zod) stay out of the main bundle.
  const { esportsUrls, parseLiveOdds, parseScoreboard } = await import("@hokejhub/core");
  const res = await fetch(esportsUrls.scoreboard(date));
  const games = res.status === 404 ? [] : res.ok ? parseScoreboard(await res.json()) : null;
  if (!games) throw new Error(`HTTP ${res.status}`);
  let liveOdds: ScoreboardResponse["liveOdds"] = {};
  if (games.some(isLive)) {
    const odds = await fetch(esportsUrls.liveOdds())
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    if (odds) liveOdds = Object.fromEntries(parseLiveOdds(odds));
  }
  return {
    date,
    games: games.sort((a, b) => a.startAt.localeCompare(b.startAt)),
    liveOdds,
    sources: { server: "error", esports: "ok" },
    fetchedAt: new Date().toISOString(),
  };
}

/** North American date of an NHL start (the league's own schedule key). */
const naDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(iso));

/** Splits a day's NHL games into the night just played and the night ahead. */
function nhlNights(games: Game[], date: string) {
  const past = games.filter((g) => naDate(g.startAt) < date);
  const next = games.filter((g) => naDate(g.startAt) >= date);
  const out: { label: string; list: Game[] }[] = [];
  if (past.length) out.push({ label: "Noc na dnešek", list: past });
  if (next.length) out.push({ label: "Dnes večer a v noci", list: next });
  return out;
}


/** Competitions with a table page in the app: the scoreboard header links straight to it. */
const TABLE_HREF: Record<string, string> = {
  "cz-elh": "/liga/cz-elh",
  nhl: "/liga/nhl",
  ...Object.fromEntries(["cz-maxa", "cz-2liga", "cz-u20", "cz-u20-2", "cz-u17", "cz-u16"].map((k) => [k, `/tabulka/${k}`])),
};

export function Scoreboard({ date, initial }: { date: string; initial: ScoreboardResponse }) {
  const today = pragueDate();
  const { data, isFetching, isError } = useQuery({
    queryKey: ["scoreboard", date],
    queryFn: () => fetchScoreboard(date),
    initialData: initial,
    retry: 3,
    retryDelay: (n) => Math.min(1000 * 2 ** n, 15_000),
    refetchInterval: (q) => (q.state.data?.games.some(isLive) ? 20_000 : date >= today ? 120_000 : false),
  });

  const [selected, setSelected] = useLeagueSelection();
  const [showAll, setShowAll] = useState(false);

  const groups = useMemo(() => {
    const byLeague = new Map<string, Game[]>();
    for (const g of data.games) {
      const list = byLeague.get(g.leagueKey) ?? [];
      list.push(g);
      byLeague.set(g.leagueKey, list);
    }
    return [...byLeague.entries()]
      .map(([key, games]) => ({ league: getLeague(key, games[0]?.leagueName), games }))
      .sort((a, b) => a.league.sort - b.league.sort || a.league.name.localeCompare(b.league.name, "cs"));
  }, [data.games]);

  const { list: favorites } = useFavorites();
  const mine = favorites.length
    ? data.games.filter((g) => isFavoriteTeam(favorites, g.home.shortName, g.home.name) || isFavoriteTeam(favorites, g.away.shortName, g.away.name))
    : [];

  const visible = groups.filter((g) => showAll || selected.includes(g.league.key));
  const hidden = groups.length - visible.length;
  const liveCount = data.games.filter(isLive).length;

  return (
    <div className="space-y-3 sm:space-y-4">
      <DateStrip date={date} today={today} />

      {/* The strip already names the day; only the count line stays (h1 kept for screen readers). */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="sr-only first-letter:uppercase">{formatDayLong(date)}</h1>
        <p className="text-sm text-muted">
          <span className="font-semibold text-fg first-letter:uppercase">{formatDayLong(date)}</span>
          <span className="mx-1.5">·</span>
          {csCount(data.games.length, CS.zapas)}
          {liveCount > 0 ? (
            <span className="ml-2 inline-flex items-center gap-1.5 text-live">
              <span className="live-dot size-1.5 rounded-full bg-live" /> {liveCount} živě
            </span>
          ) : null}
          {isFetching ? <span className="ml-2 opacity-60">aktualizuji…</span> : null}
        </p>
      </div>

      <LeagueChips groups={groups} selected={selected} onChange={setSelected} showAll={showAll} />

      <SourceStatus sources={isError ? { ...data.sources, server: "stale" } : data.sources} />

      {mine.length > 0 ? (
        <section className="overflow-hidden border border-line border-t-2 border-t-gold bg-surface">
          <h2 className="label flex items-center gap-2 px-3 pb-2 pt-3">
            <Star className="size-4 fill-gold text-gold" aria-hidden />
            Moje týmy
          </h2>
          {mine.map((g, i) => (
            <GameRow
              key={g.id}
              game={g}
              date={date}
              index={i}
              liveOdds={g.external.onlajnyId ? data.liveOdds[g.external.onlajnyId] : undefined}
              prediction={data.predictions?.[g.id]}
            />
          ))}
        </section>
      ) : null}

      {visible.length === 0 ? (
        <div className="border border-dashed border-line p-10 text-center text-muted">
          {data.games.length === 0 ? "Tento den se nehraje." : "Ve vybraných soutěžích se dnes nehraje."}
        </div>
      ) : null}

      {visible.map(({ league, games }) => (
        <section key={league.key} className="overflow-hidden border border-line bg-surface">
          <h2 className="label flex items-center gap-2 border-b border-line px-3 pb-2 pt-3">
            {league.name}
            <span className="ml-auto font-sans text-[11px] font-medium normal-case tracking-normal text-muted tabular">
              {games.filter(isLive).length > 0 ? <span className="mr-2 text-live">{games.filter(isLive).length} živě</span> : null}
              {games.length}
            </span>
            {TABLE_HREF[league.key] ? (
              <Link
                href={TABLE_HREF[league.key]!}
                className="-my-1 flex items-center gap-0.5 rounded-full border border-line px-2.5 py-1 font-sans text-[11px] font-semibold normal-case tracking-normal text-fg hover:border-accent hover:text-accent"
              >
                Tabulka
                <ChevronRight className="size-3.5" aria-hidden />
              </Link>
            ) : null}
          </h2>
          <div>
            {league.key === "nhl" && nhlNights(games, date).length > 1
              ? nhlNights(games, date).map(({ label, list }) => (
                  <div key={label}>
                    <div className="border-b border-line bg-surface-2/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {label}
                    </div>
                    {list.map((g, i) => (
                      <GameRow
                        key={g.id}
                        game={g}
                        date={date}
                        index={i}
                        liveOdds={g.external.onlajnyId ? data.liveOdds[g.external.onlajnyId] : undefined}
                        prediction={data.predictions?.[g.id]}
                      />
                    ))}
                  </div>
                ))
              : null}
            {league.key === "nhl" && nhlNights(games, date).length > 1
              ? null
              : games.map((g, i) => (
                  <GameRow
                    key={g.id}
                    game={g}
                    date={date}
                    index={i}
                    liveOdds={g.external.onlajnyId ? data.liveOdds[g.external.onlajnyId] : undefined}
                    prediction={data.predictions?.[g.id]}
                  />
                ))}
          </div>
        </section>
      ))}

      {hidden > 0 || showAll ? (
        <button onClick={() => setShowAll((v) => !v)} className="w-full border border-line py-2.5 text-sm text-muted hover:text-fg">
          {showAll ? "Jen vybrané soutěže" : `Další soutěže (${hidden})`}
        </button>
      ) : null}

      <footer className="space-y-3 border-t border-line pt-4">
        <GamblingNotice />
        <p className="text-[11px] text-muted">Data: eSports.cz / onlajny.com, kurzy Tipsport, NHL data © NHL.</p>
      </footer>
    </div>
  );
}

function DateStrip({ date, today }: { date: string; today: string }) {
  const days = Array.from({ length: 9 }, (_, i) => addDays(date, i - 4));
  return (
    <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:px-0">
      {days.map((d) => {
        const { weekday, day } = formatDayShort(d);
        const active = d === date;
        return (
          <Link
            key={d}
            href={d === today ? "/" : `/?date=${d}`}
            scroll={false}
            className={`flex min-w-16 shrink-0 flex-col items-center whitespace-nowrap border px-2.5 py-1.5 transition ${
              active ? "border-fg bg-fg text-bg" : d === today ? "border-live/60 text-fg" : "border-line text-muted hover:text-fg"
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">{d === today ? "dnes" : weekday}</span>
            <span className="display text-lg tabular">{day}</span>
          </Link>
        );
      })}
    </div>
  );
}

function LeagueChips({
  groups,
  selected,
  onChange,
  showAll,
}: {
  groups: { league: { key: string; shortName: string }; games: Game[] }[];
  selected: string[];
  onChange: (next: string[]) => void;
  showAll: boolean;
}) {
  if (groups.length === 0) return null;
  return (
    <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
      {groups.map(({ league, games }) => {
        const on = showAll || selected.includes(league.key);
        const live = games.some(isLive);
        return (
          <button
            key={league.key}
            onClick={() => onChange(on ? selected.filter((k) => k !== league.key) : [...selected, league.key])}
            aria-pressed={on}
            className={`flex shrink-0 items-center gap-1.5 border px-3 py-1 text-xs transition ${
              on ? "border-fg text-fg font-semibold" : "border-line text-muted hover:text-fg"
            }`}
          >
            {live ? <span className="live-dot size-1.5 rounded-full bg-live" /> : null}
            {league.shortName}
          </button>
        );
      })}
    </div>
  );
}

const STORAGE_KEY = "leagues";

function useLeagueSelection(): [string[], (v: string[]) => void] {
  const [selected, setSelected] = useState<string[]>([...DEFAULT_LEAGUES]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
      if (raw) setSelected(JSON.parse(raw));
    } catch {}
  }, []);
  return [
    selected,
    (v) => {
      setSelected(v);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
      } catch {}
    },
  ];
}
