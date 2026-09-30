"use client";

import { useMemo, useState } from "react";
import type { Game, NhlBoxscore, NhlGoalieLine, NhlLandingExtras, NhlRightRail, NhlSkaterLine } from "@hokejhub/core";
import { PlayerPhoto } from "../player-photo";
import { Segmented } from "./segmented";

const POS: Record<string, string> = { C: "C", L: "LK", R: "PK", D: "O", G: "B" };
const pct = (v: number | null, d = 1) => (v == null ? "–" : `${(v * 100).toFixed(d)} %`);

// ---------- player box score ----------

type SkaterKey = "points" | "goals" | "assists" | "plusMinus" | "sog" | "hits" | "blocks" | "pim" | "toi" | "shifts" | "giveaways" | "takeaways";
const COLS: { key: SkaterKey; label: string; title: string }[] = [
  { key: "goals", label: "G", title: "Góly" },
  { key: "assists", label: "A", title: "Asistence" },
  { key: "points", label: "B", title: "Body" },
  { key: "plusMinus", label: "+/−", title: "Plus/minus" },
  { key: "sog", label: "S", title: "Střely na branku" },
  { key: "hits", label: "H", title: "Hity" },
  { key: "blocks", label: "BL", title: "Zblokované střely" },
  { key: "pim", label: "TM", title: "Trestné minuty" },
  { key: "giveaways", label: "ZP", title: "Ztráty puku" },
  { key: "takeaways", label: "ZS", title: "Zisky puku" },
  { key: "shifts", label: "Stř", title: "Střídání" },
  { key: "toi", label: "TOI", title: "Čas na ledě" },
];
const toiSec = (t: string) => {
  const m = /^(\d+):(\d{2})$/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};
const val = (p: NhlSkaterLine, k: SkaterKey) => (k === "toi" ? toiSec(p.toi) : p[k]);

export function NhlPlayers({ game, box }: { game: Game; box: NhlBoxscore }) {
  const [side, setSide] = useState<"home" | "away">("home");
  const [sort, setSort] = useState<SkaterKey>("points");
  const rows = useMemo(
    () => [...box.skaters[side]].sort((a, b) => val(b, sort) - val(a, sort) || b.points - a.points || toiSec(b.toi) - toiSec(a.toi)),
    [box, side, sort],
  );
  return (
    <div className="space-y-6">
      <Segmented
        value={side}
        onChange={setSide}
        options={[
          { value: "home", label: game.home.shortName },
          { value: "away", label: game.away.shortName },
        ]}
      />
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[760px] text-xs tabular">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-1.5 pr-2 text-left font-medium">#</th>
              <th className="py-1.5 pr-2 text-left font-medium">Hráč</th>
              {COLS.map((c) => (
                <th key={c.key} className="px-1.5 py-1.5 text-right font-medium">
                  <button title={c.title} onClick={() => setSort(c.key)} className={sort === c.key ? "text-accent" : "hover:text-fg"}>
                    {c.label}
                  </button>
                </th>
              ))}
              <th className="py-1.5 pl-1.5 text-right font-medium" title="Úspěšnost na buly">
                Buly
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-surface-2">
                <td className="py-1.5 pr-2 text-muted">{p.number}</td>
                <td className="whitespace-nowrap py-1.5 pr-2">
                  <PlayerPhoto src={p.headshot} alt={p.name} size={26} className="mr-2 align-middle" />
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-1 text-muted">{POS[p.position] ?? p.position}</span>
                </td>
                {COLS.map((c) => {
                  const v = c.key === "toi" ? p.toi : p[c.key];
                  const n = typeof v === "number" ? v : 0;
                  return (
                    <td
                      key={c.key}
                      className={`px-1.5 py-1.5 text-right ${sort === c.key ? "font-semibold" : ""} ${
                        c.key === "plusMinus" && n > 0 ? "text-win" : c.key === "plusMinus" && n < 0 ? "text-live" : ""
                      }`}
                    >
                      {c.key === "plusMinus" && n > 0 ? `+${n}` : v}
                    </td>
                  );
                })}
                <td className="py-1.5 pl-1.5 text-right">{p.foPct && p.foPct > 0 ? pct(p.foPct, 0) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Goalies goalies={box.goalies[side]} />
    </div>
  );
}

function Goalies({ goalies }: { goalies: NhlGoalieLine[] }) {
  if (!goalies.length) return null;
  return (
    <div>
      <h3 className="label mb-2 text-muted">Brankáři</h3>
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[620px] text-xs tabular">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-1.5 text-left font-medium">Brankář</th>
              <th className="text-right font-medium">Zákroky</th>
              <th className="text-right font-medium">%</th>
              <th className="text-right font-medium" title="Střely v plném počtu / přesilovce soupeře / oslabení soupeře">5/5 · PP · SH</th>
              <th className="text-right font-medium">Čas</th>
              <th className="text-right font-medium">Výsledek</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {goalies.map((g) => (
              <tr key={g.id}>
                <td className="whitespace-nowrap py-1.5">
                  <PlayerPhoto src={g.headshot} alt={g.name} size={26} className="mr-2 align-middle" />
                  <span className="font-medium">{g.name}</span>
                </td>
                <td className="text-right">
                  {g.saves}/{g.shotsAgainst}
                </td>
                <td className="text-right font-semibold">{pct(g.savePct)}</td>
                <td className="text-right text-muted">
                  {g.evenStrength} · {g.powerPlay} · {g.shortHanded}
                </td>
                <td className="text-right">{g.toi}</td>
                <td className="text-right">{g.decision === "W" ? "výhra" : g.decision === "L" ? "prohra" : g.decision === "O" ? "prohra v prodl." : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- three stars ----------

export function ThreeStars({ stars }: { stars: NhlLandingExtras["threeStars"] }) {
  if (!stars.length) return null;
  return (
    <ol className="grid grid-cols-3 gap-3">
      {stars.map((s) => (
        <li key={s.star} className="flex flex-col items-center gap-1.5 text-center">
          <div className="relative">
            <PlayerPhoto src={s.headshot} alt={s.name} size={s.star === 1 ? 72 : 60} />
            <span className="display absolute -bottom-1 -right-1 grid size-6 place-items-center bg-gold text-sm text-black">{s.star}</span>
          </div>
          <div className="text-sm font-semibold leading-tight">{s.name}</div>
          <div className="text-xs text-muted">
            {s.team}
            {s.position === "G" ? (s.savePct != null ? ` · ${pct(s.savePct)}` : "") : s.points != null ? ` · ${s.goals}+${s.assists}` : ""}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------- officials & info ----------

export function NhlInfoRows({ rail, extras, game }: { rail: NhlRightRail | null; extras: NhlLandingExtras; game: Game }) {
  return (
    <>
      {extras.venue ? (
        <>
          <dt className="text-muted">Aréna</dt>
          <dd>{extras.venue}</dd>
        </>
      ) : null}
      {extras.tv.length ? (
        <>
          <dt className="text-muted">TV</dt>
          <dd>{extras.tv.join(", ")}</dd>
        </>
      ) : null}
      {rail?.referees.length ? (
        <>
          <dt className="text-muted">Rozhodčí</dt>
          <dd>{rail.referees.join(", ")}</dd>
        </>
      ) : null}
      {rail?.linesmen.length ? (
        <>
          <dt className="text-muted">Čároví</dt>
          <dd>{rail.linesmen.join(", ")}</dd>
        </>
      ) : null}
      {rail?.coaches.home || rail?.coaches.away ? (
        <>
          <dt className="text-muted">Trenéři</dt>
          <dd>
            {game.home.shortName}: {rail.coaches.home ?? "–"} · {game.away.shortName}: {rail.coaches.away ?? "–"}
          </dd>
        </>
      ) : null}
      {rail && (rail.scratches.home.length || rail.scratches.away.length) ? (
        <>
          <dt className="text-muted">Mimo sestavu</dt>
          <dd className="text-muted">
            {game.home.abbrev}: {rail.scratches.home.join(", ") || "–"}
            <br />
            {game.away.abbrev}: {rail.scratches.away.join(", ") || "–"}
          </dd>
        </>
      ) : null}
    </>
  );
}

export function SeasonSeries({ rail, game }: { rail: NhlRightRail; game: Game }) {
  const done = rail.seasonSeries.filter((g) => g.homeScore != null && (g.state === "OFF" || g.state === "FINAL"));
  if (!rail.seasonSeries.length) return null;
  return (
    <div>
      {rail.seriesWins ? (
        <p className="mb-3 text-sm">
          Vzájemná bilance v sezóně: <b className="tabular">{game.home.abbrev} {rail.seriesWins.home}</b> – <b className="tabular">{rail.seriesWins.away} {game.away.abbrev}</b>
        </p>
      ) : null}
      <ul className="divide-y divide-line text-sm">
        {rail.seasonSeries.map((g) => (
          <li key={g.id} className="flex items-center gap-3 py-1.5 tabular">
            <span className="w-20 text-xs text-muted">{new Date(g.date).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "2-digit" })}</span>
            <span className="flex-1">
              {g.awayAbbrev} @ {g.homeAbbrev}
            </span>
            <span className="font-semibold">{done.includes(g) ? `${g.awayScore}:${g.homeScore}` : "–"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- pre-game matchup ----------

export function NhlMatchup({ game, extras, rail }: { game: Game; extras: NhlLandingExtras; rail: NhlRightRail | null }) {
  const m = extras.matchup;
  const ts = rail?.teamSeason;
  return (
    <div className="space-y-6">
      {m?.leaders.length ? (
        <div>
          <h3 className="label mb-3 text-muted">
            Lídři týmů{m.season ? ` v sezóně ${String(m.season).slice(0, 4)}/${String(m.season).slice(6)}` : ""}
          </h3>
          <div className="space-y-3">
            {m.leaders.map((l) => (
              <div key={l.category} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <Leader p={l.home} align="left" />
                <span className="label w-20 text-center text-muted">{l.label}</span>
                <Leader p={l.away} align="right" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {m && (m.goalies.home.length || m.goalies.away.length) ? (
        <div>
          <h3 className="label mb-3 text-muted">Brankáři</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["home", "away"] as const).map((side) => (
              <div key={side}>
                <div className="mb-2 text-xs text-muted">
                  {game[side].shortName}
                  {m.goalieTotals[side] ? ` · tým ${m.goalieTotals[side]!.record}, ${pct(m.goalieTotals[side]!.savePct)}` : ""}
                </div>
                <ul className="space-y-2">
                  {m.goalies[side].slice(0, 2).map((g) => (
                    <li key={g.id} className="flex items-center gap-2.5">
                      <PlayerPhoto src={g.headshot} alt={g.name} size={36} ring={side} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{g.name}</div>
                        <div className="text-xs text-muted tabular">
                          {g.gp ? `${g.gp} záp. · ${g.record} · ${g.shutouts ?? 0} ČK` : "bez zápasu v sezóně"}
                        </div>
                      </div>
                      <div className="text-right tabular">
                        <div className="display text-lg">{pct(g.savePct)}</div>
                        <div className="text-[11px] text-muted">GAA {g.gaa?.toFixed(2) ?? "–"}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {ts ? (
        <div>
          <h3 className="label mb-3 text-muted">Tým v sezóně (pořadí v NHL)</h3>
          <table className="w-full text-sm tabular">
            <thead>
              <tr className="text-xs text-muted">
                <th className="py-1 text-left font-medium">{game.home.abbrev}</th>
                <th />
                <th className="py-1 text-right font-medium">{game.away.abbrev}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(
                [
                  ["Góly na zápas", ts.home.gfPerGame?.toFixed(2), ts.home.ranks.gf, ts.away.gfPerGame?.toFixed(2), ts.away.ranks.gf],
                  ["Obdržené na zápas", ts.home.gaPerGame?.toFixed(2), ts.home.ranks.ga, ts.away.gaPerGame?.toFixed(2), ts.away.ranks.ga],
                  ["Přesilovky", pct(ts.home.ppPct), ts.home.ranks.pp, pct(ts.away.ppPct), ts.away.ranks.pp],
                  ["Oslabení", pct(ts.home.pkPct), ts.home.ranks.pk, pct(ts.away.pkPct), ts.away.ranks.pk],
                  ["Buly", pct(ts.home.foPct), ts.home.ranks.fo, pct(ts.away.foPct), ts.away.ranks.fo],
                ] as const
              ).map(([label, hv, hr, av, ar]) => (
                <tr key={label}>
                  <td className="py-1.5">
                    <b>{hv ?? "–"}</b> <span className="text-xs text-muted">{hr ? `${hr}.` : ""}</span>
                  </td>
                  <td className="text-center text-xs text-muted">{label}</td>
                  <td className="py-1.5 text-right">
                    <span className="text-xs text-muted">{ar ? `${ar}.` : ""}</span> <b>{av ?? "–"}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function Leader({ p, align }: { p: { name: string; headshot: string; value: number } | null; align: "left" | "right" }) {
  if (!p) return <span />;
  return (
    <div className={`flex items-center gap-2.5 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <PlayerPhoto src={p.headshot} alt={p.name} size={40} ring={align === "left" ? "home" : "away"} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{p.name}</div>
        <div className="display text-xl tabular">{p.value}</div>
      </div>
    </div>
  );
}
