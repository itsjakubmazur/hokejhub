"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { computeOverUnder, computeStandings, rulesForSeason, type FormResult, type ResultGame, type Split } from "@hokejhub/core";
import { Segmented } from "../game/segmented";
import { PHONE_NAMES } from "@/lib/team-names";
import { ClubLogo } from "../club-logo";

const FORM_STYLE: Record<FormResult, string> = {
  W: "bg-win text-white",
  OTW: "bg-win/60 text-white",
  T: "bg-muted/50 text-white",
  OTL: "bg-gold/70 text-black",
  L: "bg-live text-white",
};
const FORM_LABEL: Record<FormResult, string> = { W: "V", OTW: "VP", T: "R", OTL: "PP", L: "P" };

export function FormBadges({ form }: { form: FormResult[] }) {
  return (
    <span className="flex gap-px sm:gap-0.5">
      {form.map((f, i) => (
        <span
          key={i}
          title={FORM_LABEL[f]}
          className={`grid h-3.5 min-w-3.5 place-items-center rounded-[3px] px-[1px] text-[0.5rem] font-bold leading-none sm:h-5 sm:min-w-5 sm:rounded sm:px-0.5 sm:text-[9px] ${FORM_STYLE[f]}`}
        >
          {FORM_LABEL[f]}
        </span>
      ))}
    </span>
  );
}

type Mode = "table" | "ou";

/** Columns phones reach by scrolling the table sideways (in this order, after the form). */
const MOBILE_EXTRA: { key: "w" | "otw" | "t" | "otl" | "l" | "diff"; label: string; title: string }[] = [
  { key: "w", label: "V", title: "Výhry" },
  { key: "otw", label: "VP", title: "Výhry po prodl./nájezdech" },
  { key: "t", label: "R", title: "Remízy" },
  { key: "otl", label: "PP", title: "Prohry po prodl./nájezdech" },
  { key: "l", label: "P", title: "Prohry" },
  { key: "diff", label: "+/−", title: "Rozdíl skóre" },
];

export function Standings({
  games,
  season,
  logos = {},
  highlight = [],
  shortNames = {},
  liveGames: initialLive = [],
}: {
  games: ResultGame[];
  season: number;
  logos?: Record<string, string>;
  /** Short club names shown on phones. */
  shortNames?: Record<string, string>;
  highlight?: string[];
  /** Games in progress (provisional scores) for the live table. */
  liveGames?: (ResultGame & { live: string })[];
}) {
  const { data: liveGames = initialLive } = useQuery({
    queryKey: ["live-elh"],
    queryFn: async () => (await fetch("/api/live/elh")).json() as Promise<(ResultGame & { live: string })[]>,
    initialData: initialLive,
    refetchInterval: initialLive.length ? 20_000 : false,
    enabled: initialLive.length > 0,
  });
  const [liveOn, setLiveOn] = useState(true);
  const useLive = liveOn && liveGames.length > 0;
  const rules = rulesForSeason(season);
  const [mode, setMode] = useState<Mode>("table");
  const [split, setSplit] = useState<Split>("overall");
  const [lastN, setLastN] = useState<"all" | "5" | "10" | "15">("all");
  const [line, setLine] = useState<"4.5" | "5.5" | "6.5">("5.5");

  const rows = useMemo(
    () => computeStandings(useLive ? [...games, ...liveGames] : games, { split, lastN: lastN === "all" ? undefined : Number(lastN), rules }),
    [games, liveGames, useLive, split, lastN, rules],
  );
  const baseRank = useMemo(
    () => new Map(computeStandings(games, { split, lastN: lastN === "all" ? undefined : Number(lastN), rules }).map((r) => [r.teamId, r.rank])),
    [games, split, lastN, rules],
  );
  const liveBy = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of liveGames) {
      m.set(g.homeId, `${g.homeScore}:${g.awayScore} ${g.live}`);
      m.set(g.awayId, `${g.awayScore}:${g.homeScore} ${g.live}`);
    }
    return m;
  }, [liveGames]);
  const ties = rows.some((r) => r.t > 0);
  const extras = MOBILE_EXTRA.filter((c) => ties || c.key !== "t");
  type Row = (typeof rows)[number];
  const rankCell = (r: Row) => (
    <span className="flex items-center gap-1">
      <span
        className={`grid size-6 place-items-center rounded-md text-xs font-bold ${
          r.rank <= 6 ? "bg-accent/20 text-accent" : r.rank <= 10 ? "bg-surface-2" : "text-muted"
        }`}
      >
        {r.rank}
      </span>
      {useLive && baseRank.get(r.teamId) && baseRank.get(r.teamId) !== r.rank ? (
        <span className={`text-[10px] font-bold ${baseRank.get(r.teamId)! > r.rank ? "text-win" : "text-live"}`}>
          {baseRank.get(r.teamId)! > r.rank ? "▲" : "▼"}
          {Math.abs(baseRank.get(r.teamId)! - r.rank)}
        </span>
      ) : null}
    </span>
  );
  const teamCell = (r: Row, phone: boolean) => (
    <span className="flex min-w-0 items-center gap-2">
      <ClubLogo src={logos[r.teamId]} alt={r.teamName} size={24} />
      <Link href={`/tym/${r.teamId}`} className="min-w-0 truncate hover:text-accent">
        {phone ? (PHONE_NAMES[r.teamId] ?? shortNames[r.teamId] ?? r.teamName) : r.teamName}
      </Link>
      {useLive && liveBy.get(r.teamId) ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded bg-live/15 px-1.5 py-0.5 text-[10px] font-bold text-live">
          <span className="live-dot size-1.5 rounded-full bg-live" />
          {liveBy.get(r.teamId)}
        </span>
      ) : null}
    </span>
  );
  const ou = useMemo(() => computeOverUnder(games, Number(line)), [games, line]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Segmented value={mode} onChange={setMode} options={[{ value: "table", label: "Tabulka" }, { value: "ou", label: "Over/Under" }]} />
        {liveGames.length > 0 ? (
          <button
            onClick={() => setLiveOn((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${liveOn ? "bg-live text-white" : "bg-surface-2 text-muted"}`}
          >
            <span className={`size-1.5 rounded-full ${liveOn ? "live-dot bg-white" : "bg-live"}`} />
            Live tabulka
          </button>
        ) : null}
        {mode === "table" ? (
          <>
            <Segmented
              value={split}
              onChange={setSplit}
              options={[
                { value: "overall", label: "Celkem" },
                { value: "home", label: "Doma" },
                { value: "away", label: "Venku" },
              ]}
            />
            <Segmented
              value={lastN}
              onChange={setLastN}
              options={[
                { value: "all", label: "Sezóna" },
                { value: "5", label: "Forma 5" },
                { value: "10", label: "Forma 10" },
                { value: "15", label: "Forma 15" },
              ]}
            />
          </>
        ) : (
          <Segmented
            value={line}
            onChange={setLine}
            options={[
              { value: "4.5", label: "4,5" },
              { value: "5.5", label: "5,5" },
              { value: "6.5", label: "6,5" },
            ]}
          />
        )}
      </div>
      <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        {mode === "table" ? (
          <>
            {/* Phones in portrait: a fixed-layout table that opens on rank, club, games, goals,
                points and form at exactly the screen width; the win/loss split and goal difference
                sit to the right and scroll in, with rank and club pinned. */}
            <table
              className="w-[calc(100%+var(--extra))] table-fixed text-sm tabular sm:hidden"
              style={{ "--extra": `${extras.length * 2.4}rem` } as React.CSSProperties}
            >
              <colgroup>
                <col className="w-8" />
                <col />
                <col className="w-7" />
                <col className="w-[3.4rem]" />
                <col className="w-8" />
                <col className="w-[6.2rem]" />
                {extras.map((c) => (
                  <col key={c.key} className="w-[2.4rem]" />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="sticky left-0 z-10 bg-surface py-2 text-left font-medium shadow-[-0.75rem_0_0_var(--surface)]">#</th>
                  <th className="sticky left-8 z-10 bg-surface py-2 pr-2 text-left font-medium">Tým</th>
                  <th className="text-right font-medium" title="Zápasy">Z</th>
                  <th className="text-right font-medium" title="Skóre">G</th>
                  <th className="text-right font-bold">B</th>
                  <th className="pl-2 text-left font-medium">Forma</th>
                  {extras.map((c) => (
                    <th key={c.key} title={c.title} className="text-right font-medium">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <motion.tr
                    key={r.teamId}
                    layout="position"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    className={highlight.includes(r.teamId) ? "bg-accent-soft" : ""}
                  >
                    <td className="sticky left-0 z-10 bg-surface py-2 shadow-[-0.75rem_0_0_var(--surface)]">{rankCell(r)}</td>
                    <td className="sticky left-8 z-10 bg-surface py-2 pr-2 font-medium">{teamCell(r, true)}</td>
                    <td className="text-right">{r.gp}</td>
                    <td className="text-right">
                      {r.gf}:{r.ga}
                    </td>
                    <td className="text-right font-bold">{r.pts}</td>
                    <td className="pl-2">
                      <FormBadges form={r.form} />
                    </td>
                    {extras.map((c) => {
                      const v = c.key === "diff" ? r.gf - r.ga : r[c.key];
                      return (
                        <td key={c.key} className={`text-right ${c.key === "diff" ? (v > 0 ? "text-win" : v < 0 ? "text-live" : "") : ""}`}>
                          {c.key === "diff" && v > 0 ? "+" : ""}
                          {v}
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </tbody>
            </table>

            <table className="hidden w-full min-w-[560px] text-sm tabular sm:table">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="py-2 pr-2 text-left font-medium">#</th>
                  <th className="py-2 pr-2 text-left font-medium">Tým</th>
                  <th className="px-1.5 text-right font-medium" title="Zápasy">Z</th>
                  <th className="px-1.5 text-right font-medium" title="Výhry">V</th>
                  <th className="px-1.5 text-right font-medium" title="Výhry po prodl./nájezdech">VP</th>
                  {ties ? <th className="px-1.5 text-right font-medium" title="Remízy">R</th> : null}
                  <th className="px-1.5 text-right font-medium" title="Prohry po prodl./nájezdech">PP</th>
                  <th className="px-1.5 text-right font-medium" title="Prohry">P</th>
                  <th className="px-1.5 text-right font-medium">Skóre</th>
                  <th className="px-1.5 text-right font-medium">+/−</th>
                  <th className="px-1.5 text-right font-bold">B</th>
                  <th className="pl-3 text-left font-medium">Forma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <motion.tr
                    key={r.teamId}
                    layout="position"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    className={`transition-colors hover:bg-surface-2 ${highlight.includes(r.teamId) ? "bg-accent-soft" : ""}`}
                  >
                    <td className="py-2 pr-2">{rankCell(r)}</td>
                    <td className="whitespace-nowrap py-2 pr-2 font-medium">{teamCell(r, false)}</td>
                    <td className="px-1.5 text-right">{r.gp}</td>
                    <td className="px-1.5 text-right">{r.w}</td>
                    <td className="px-1.5 text-right">{r.otw}</td>
                    {ties ? <td className="px-1.5 text-right">{r.t}</td> : null}
                    <td className="px-1.5 text-right">{r.otl}</td>
                    <td className="px-1.5 text-right">{r.l}</td>
                    <td className="px-1.5 text-right">
                      {r.gf}:{r.ga}
                    </td>
                    <td className={`px-1.5 text-right ${r.gf - r.ga > 0 ? "text-win" : r.gf - r.ga < 0 ? "text-live" : ""}`}>
                      {r.gf - r.ga > 0 ? "+" : ""}
                      {r.gf - r.ga}
                    </td>
                    <td className="px-1.5 text-right font-bold">{r.pts}</td>
                    <td className="pl-3">
                      <FormBadges form={r.form} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <table className="w-full min-w-[420px] text-sm tabular">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-2 text-left font-medium">Tým</th>
                <th className="px-2 text-right font-medium">Z</th>
                <th className="px-2 text-right font-medium">Over {line.replace(".", ",")}</th>
                <th className="px-2 text-right font-medium">Under {line.replace(".", ",")}</th>
                <th className="px-2 text-right font-medium">Over %</th>
                <th className="px-2 text-right font-medium">Ø gólů</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ou.map((r) => (
                <tr key={r.teamId} className="hover:bg-surface-2">
                  <td className="py-2 font-medium">
                    <ClubLogo src={logos[r.teamId]} alt={r.teamName} size={28} className="mr-2 align-middle" />
                    <Link href={`/tym/${r.teamId}`} className="hover:text-accent">
                      {r.teamName}
                    </Link>
                  </td>
                  <td className="px-2 text-right">{r.gp}</td>
                  <td className="px-2 text-right">{r.over}</td>
                  <td className="px-2 text-right">{r.under}</td>
                  <td className="px-2 text-right font-semibold">{Math.round((r.over / (r.gp || 1)) * 100)} %</td>
                  <td className="px-2 text-right">{r.avgTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {mode === "table" ? <span className="sm:hidden">Posunutím tabulky doleva uvidíš rozpad výher a proher a rozdíl skóre. </span> : null}
        V = výhra, VP = výhra po prodloužení/nájezdech, {ties ? "R = remíza, " : ""}PP = prohra po prodloužení/nájezdech, P = prohra. Bodování této sezóny: {rules.label}.
      </p>
    </div>
  );
}
