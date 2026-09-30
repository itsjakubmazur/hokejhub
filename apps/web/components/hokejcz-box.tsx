"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { HokejczMatch, HokejczSkaterLine } from "@hokejhub/core";

const fmtToi = (s: number | null) => (s === null ? "–" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

/** Title-cases hokej.cz's "Jméno PŘÍJMENÍ" into "Jméno Příjmení". */
const nice = (name: string) =>
  name.replace(/\p{Lu}{2,}/gu, (w) => w.charAt(0) + w.slice(1).toLocaleLowerCase("cs"));

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rise border border-line bg-surface p-4 sm:p-5">
      <h2 className="label mb-4">{title}</h2>
      {children}
    </section>
  );
}

export function HokejczTimeline({ box }: { box: HokejczMatch }) {
  const byPeriod = useMemo(() => {
    const map = new Map<string, { goals: HokejczMatch["goals"]; penalties: HokejczMatch["penalties"] }>();
    for (const g of box.goals) {
      const e = map.get(g.period) ?? { goals: [], penalties: [] };
      e.goals.push(g);
      map.set(g.period, e);
    }
    for (const p of box.penalties) {
      const e = map.get(p.period) ?? { goals: [], penalties: [] };
      e.penalties.push(p);
      map.set(p.period, e);
    }
    return [...map.entries()];
  }, [box]);

  if (byPeriod.length === 0) return null;
  let home = 0;
  let away = 0;

  return (
    <Section title="Průběh zápasu">
      <div className="space-y-4">
        {byPeriod.map(([period, { goals, penalties }]) => {
          const events = [
            ...goals.map((g) => ({ kind: "goal" as const, time: g.time, g })),
            ...penalties.map((p) => ({ kind: "pen" as const, time: p.time, p })),
          ].sort((a, b) => a.time.localeCompare(b.time));
          return (
            <div key={period}>
              <h3 className="mb-1 label text-muted">{period}</h3>
              <ol className="divide-y divide-line">
                {events.map((e, i) => {
                  if (e.kind === "goal") {
                    const isHome = e.g.team === box.home.abbrev;
                    if (isHome) home++;
                    else away++;
                    return (
                      <li key={i} className="flex items-start gap-3 py-2 text-sm">
                        <span className="w-11 shrink-0 pt-0.5 text-xs text-muted tabular">{e.time}</span>
                        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${isHome ? "bg-home" : "bg-away"}`} />
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{nice(e.g.scorer.name)}</span>
                          {e.g.scorerSeasonGoals ? <span className="text-muted"> ({e.g.scorerSeasonGoals})</span> : null}
                          {e.g.situation && e.g.situation !== "5/5" ? (
                            <span className="ml-1.5 rounded bg-accent-soft px-1 text-[10px] font-semibold text-accent">
                              {e.g.situation}
                            </span>
                          ) : null}
                          {e.g.assists.length > 0 ? (
                            <span className="block text-xs text-muted">{e.g.assists.map((a) => nice(a.name)).join(", ")}</span>
                          ) : null}
                        </span>
                        <span className="font-semibold tabular">
                          {home}:{away}
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={i} className="flex items-center gap-3 py-1.5 text-xs text-muted">
                      <span className="w-11 shrink-0 tabular">{e.time}</span>
                      <span className="shrink-0 rounded bg-gold/15 px-1 font-semibold text-gold">{e.p.minutes ?? "?"}′</span>
                      <span className="min-w-0 flex-1 truncate">
                        {nice(e.p.player.name)} · {e.p.reason}
                      </span>
                      <span className="shrink-0">{e.p.team}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

const STAT_ORDER = [
  "Střely na branku",
  "Zblokované střely",
  "Zásahy brankářů",
  "Vhazování",
  "Hity",
  "Bloky",
  "Vyloučení",
  "Využití",
  "V oslabení",
  "Trestné minuty",
  "Radegast index",
];

export function HokejczTeamStats({ box }: { box: HokejczMatch }) {
  const rows = STAT_ORDER.filter((k) => box.teamStats[k]).map((k) => [k, box.teamStats[k]!] as const);
  if (rows.length === 0) return null;
  return (
    <Section title="Statistiky zápasu">
      <div className="mb-3 flex justify-between text-xs font-semibold">
        <span className="text-home">{box.home.abbrev}</span>
        <span className="text-away">{box.away.abbrev}</span>
      </div>
      <div className="space-y-2.5">
        {rows.map(([label, [h, a]]) => {
          const total = Math.abs(h) + Math.abs(a) || 1;
          return (
            <div key={label}>
              <div className="flex items-center justify-between text-sm tabular">
                <span className={h > a ? "font-semibold" : ""}>{h}</span>
                <span className="text-xs text-muted">{label}</span>
                <span className={a > h ? "font-semibold" : ""}>{a}</span>
              </div>
              <div className="mt-1 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
                <div className="rounded-l-full bg-home" style={{ width: `${(Math.abs(h) / total) * 100}%` }} />
                <div className="rounded-r-full bg-away" style={{ width: `${(Math.abs(a) / total) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {box.shotsByPeriod.length > 0 ? (
        <p className="mt-3 text-xs text-muted tabular">
          Střely po třetinách: {box.shotsByPeriod.map(([h, a]) => `${h}:${a}`).join(", ")}
        </p>
      ) : null}
    </Section>
  );
}

type SortKey = keyof Pick<
  HokejczSkaterLine,
  "points" | "goals" | "assists" | "plusMinus" | "shots" | "hits" | "blocks" | "toiSeconds" | "radegastIndex" | "pim"
>;

const COLUMNS: { key: SortKey; label: string; title: string }[] = [
  { key: "goals", label: "G", title: "Góly" },
  { key: "assists", label: "A", title: "Asistence" },
  { key: "points", label: "B", title: "Body" },
  { key: "plusMinus", label: "+/−", title: "Plus/minus" },
  { key: "shots", label: "S", title: "Střely" },
  { key: "hits", label: "H", title: "Hity" },
  { key: "blocks", label: "BL", title: "Bloky" },
  { key: "pim", label: "TM", title: "Trestné minuty" },
  { key: "toiSeconds", label: "TOI", title: "Čas na ledě" },
  { key: "radegastIndex", label: "RI", title: "Radegast index" },
];

export function HokejczBoxScore({ box }: { box: HokejczMatch }) {
  const [side, setSide] = useState<"home" | "away">("home");
  const [sort, setSort] = useState<SortKey>("toiSeconds");
  const skaters = useMemo(
    () => [...box.skaters[side]].sort((a, b) => (b[sort] ?? -999) - (a[sort] ?? -999)),
    [box, side, sort],
  );
  if (box.skaters.home.length + box.skaters.away.length === 0) return null;
  const team = box[side];

  return (
    <Section title="Box score">
      <div className="mb-3 flex rounded-lg bg-surface-2 p-0.5 text-xs">
        {(["home", "away"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`flex-1 rounded-md px-2.5 py-1.5 transition ${side === s ? "bg-surface text-fg shadow-sm" : "text-muted"}`}
          >
            {box[s].shortName || box[s].abbrev}
          </button>
        ))}
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[640px] text-xs tabular">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-1.5 pr-2 text-left font-medium">#</th>
              <th className="py-1.5 pr-2 text-left font-medium">Hráč</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-1.5 py-1.5 text-right font-medium">
                  <button
                    title={c.title}
                    onClick={() => setSort(c.key)}
                    className={sort === c.key ? "text-accent" : "hover:text-fg"}
                  >
                    {c.label}
                  </button>
                </th>
              ))}
              <th className="px-1.5 py-1.5 text-right font-medium" title="PP / SH čas">
                PP/SH
              </th>
              <th className="py-1.5 pl-1.5 text-right font-medium" title="Vhazování">
                Buly
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {skaters.map((p) => (
              <tr key={`${p.number}-${p.player.name}`}>
                <td className="py-1.5 pr-2 text-muted">{p.number}</td>
                <td className="whitespace-nowrap py-1.5 pr-2">
                  <span className="font-medium">{nice(p.player.name)}</span>
                  <span className="ml-1 text-muted">{p.position}</span>
                </td>
                {COLUMNS.map((c) => (
                  <td
                    key={c.key}
                    className={`px-1.5 py-1.5 text-right ${sort === c.key ? "font-semibold" : ""} ${
                      c.key === "plusMinus" && p.plusMinus > 0 ? "text-win" : c.key === "plusMinus" && p.plusMinus < 0 ? "text-live" : ""
                    }`}
                  >
                    {c.key === "toiSeconds" ? fmtToi(p.toiSeconds) : c.key === "plusMinus" && p.plusMinus > 0 ? `+${p.plusMinus}` : (p[c.key] ?? "–")}
                  </td>
                ))}
                <td className="whitespace-nowrap px-1.5 py-1.5 text-right text-muted">
                  {fmtToi(p.ppToiSeconds)} / {fmtToi(p.shToiSeconds)}
                </td>
                <td className="whitespace-nowrap py-1.5 pl-1.5 text-right">
                  {p.faceoffsTaken ? `${p.faceoffsWon}/${p.faceoffsTaken}` : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {box.goalies[side].length > 0 ? (
        <table className="mt-4 w-full text-xs tabular">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-1.5 text-left font-medium">Brankář</th>
              <th className="py-1.5 text-right font-medium">Čas</th>
              <th className="py-1.5 text-right font-medium">Zákroky</th>
              <th className="py-1.5 text-right font-medium">Góly</th>
              <th className="py-1.5 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {box.goalies[side].map((g) => (
              <tr key={g.player.name}>
                <td className="py-1.5 font-medium">{nice(g.player.name)}</td>
                <td className="py-1.5 text-right">{fmtToi(g.toiSeconds)}</td>
                <td className="py-1.5 text-right">{g.saves}</td>
                <td className="py-1.5 text-right">{g.goalsAgainst}</td>
                <td className="py-1.5 text-right font-semibold">{g.savePct?.toFixed(2) ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <p className="mt-3 text-[11px] text-muted">
        {team.name} · Data: hokej.cz
      </p>
    </Section>
  );
}

export function HokejczInfo({ box }: { box: HokejczMatch }) {
  return (
    <>
      {box.attendance ? (
        <>
          <dt className="text-muted">Diváci</dt>
          <dd className="tabular">
            {box.attendance.toLocaleString("cs-CZ")}
            {box.capacity ? <span className="text-muted"> / {box.capacity.toLocaleString("cs-CZ")}</span> : null}
          </dd>
        </>
      ) : null}
      {box.venue ? (
        <>
          <dt className="text-muted">Stadion</dt>
          <dd>{box.venue}</dd>
        </>
      ) : null}
      {box.round ? (
        <>
          <dt className="text-muted">Kolo</dt>
          <dd>{box.round}</dd>
        </>
      ) : null}
      {box.referees.length > 0 ? (
        <>
          <dt className="text-muted">Rozhodčí</dt>
          <dd>{box.referees.join(", ")}</dd>
        </>
      ) : null}
    </>
  );
}
