"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  DEFAULT_LEAGUES,
  esportsUrls,
  getLeague,
  parseLiveOdds,
  parseScoreboard,
  pragueDate,
  type Game,
} from "@hokejhub/core";
import type { ScoreboardResponse } from "@/lib/types";
import { formatDayLong, formatDayShort } from "@/lib/format";
import { GameCard } from "./game-card";
import { GamblingNotice } from "./gambling-notice";
import { SourceStatus } from "./source-status";

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
  const res = await fetch(esportsUrls.scoreboard(date));
  const games = res.status === 404 ? [] : res.ok ? parseScoreboard(await res.json()) : null;
  if (!games) throw new Error(`HTTP ${res.status}`);
  let liveOdds: ScoreboardResponse["liveOdds"] = {};
  if (games.some(isLive)) {
    const odds = await fetch(esportsUrls.liveOdds()).then((r) => (r.ok ? r.json() : null)).catch(() => null);
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

  const visible = groups.filter((g) => showAll || selected.includes(g.league.key));
  const hidden = groups.length - visible.length;
  const liveCount = data.games.filter(isLive).length;

  return (
    <div className="space-y-5">
      <DateStrip date={date} today={today} />

      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight first-letter:uppercase">{formatDayLong(date)}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {data.games.length} zápasů
            {liveCount > 0 ? (
              <span className="ml-2 inline-flex items-center gap-1.5 text-live">
                <span className="live-dot size-1.5 rounded-full bg-live" /> {liveCount} živě
              </span>
            ) : null}
            {isFetching ? <span className="ml-2 opacity-60">aktualizuji…</span> : null}
          </p>
        </div>
      </div>

      <LeagueChips groups={groups} selected={selected} onChange={setSelected} showAll={showAll} />

      <SourceStatus sources={isError ? { ...data.sources, server: "stale" } : data.sources} />

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">
          {data.games.length === 0 ? "Tento den se nehraje." : "Ve vybraných soutěžích se dnes nehraje."}
        </div>
      ) : null}

      {visible.map(({ league, games }) => (
        <section key={league.key} className="rise">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
            {league.name}
            <span className="rounded-md bg-surface-2 px-1.5 text-[11px] font-medium tabular">{games.length}</span>
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                date={date}
                liveOdds={g.external.onlajnyId ? data.liveOdds[g.external.onlajnyId] : undefined}
              />
            ))}
          </div>
        </section>
      ))}

      {hidden > 0 || showAll ? (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="w-full rounded-xl border border-line py-2.5 text-sm text-muted hover:text-fg"
        >
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
    <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {days.map((d) => {
        const { weekday, day } = formatDayShort(d);
        const active = d === date;
        return (
          <Link
            key={d}
            href={d === today ? "/" : `/?date=${d}`}
            scroll={false}
            className={`flex min-w-14 flex-col items-center rounded-xl px-2.5 py-1.5 text-xs transition ${
              active ? "bg-accent text-bg" : "bg-surface text-muted hover:text-fg"
            }`}
          >
            <span className="uppercase">{d === today ? "dnes" : weekday}</span>
            <span className="font-semibold tabular">{day}</span>
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
    <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {groups.map(({ league, games }) => {
        const on = showAll || selected.includes(league.key);
        const live = games.some(isLive);
        return (
          <button
            key={league.key}
            onClick={() =>
              onChange(on ? selected.filter((k) => k !== league.key) : [...selected, league.key])
            }
            aria-pressed={on}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
              on ? "border-accent/50 bg-accent-soft text-accent" : "border-line text-muted hover:text-fg"
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
