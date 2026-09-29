"use client";

import { useMemo, useState } from "react";
import type { NhlPlayerRef, ShotEvent } from "@hokejhub/core";

type Filter = "all" | "goals" | "sog";

/**
 * Full-rink shot map (NHL coordinates, feet). Home attempts are drawn on the right half,
 * away attempts on the left; coordinates come pre-normalised so each team attacks +x.
 */
export function ShotMap({
  shots,
  homeId,
  players,
  homeAbbrev,
  awayAbbrev,
}: {
  shots: ShotEvent[];
  homeId: string;
  players: Record<string, NhlPlayerRef> | null;
  homeAbbrev: string;
  awayAbbrev: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [hover, setHover] = useState<ShotEvent | null>(null);

  const points = useMemo(
    () =>
      shots
        .filter((s) => s.x !== null && s.y !== null && s.type !== "blocked-shot")
        .filter((s) => (filter === "goals" ? s.type === "goal" : filter === "sog" ? s.type !== "missed-shot" : true))
        .map((s) => {
          const home = s.teamId === homeId;
          return { s, home, cx: home ? s.x! : -s.x!, cy: home ? -s.y! : s.y! };
        }),
    [shots, filter, homeId],
  );

  const count = (home: boolean, t: ShotEvent["type"][]) =>
    shots.filter((s) => (s.teamId === homeId) === home && t.includes(s.type)).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-4 text-xs text-muted tabular">
          <span>
            <span className="mr-1 inline-block size-2 rounded-full bg-away" />
            {awayAbbrev}: {count(false, ["goal", "shot-on-goal"])} SOG · {count(false, ["goal", "shot-on-goal", "missed-shot", "blocked-shot"])} pokusů
          </span>
          <span>
            <span className="mr-1 inline-block size-2 rounded-full bg-home" />
            {homeAbbrev}: {count(true, ["goal", "shot-on-goal"])} SOG · {count(true, ["goal", "shot-on-goal", "missed-shot", "blocked-shot"])} pokusů
          </span>
        </div>
        <div className="flex rounded-lg bg-surface-2 p-0.5 text-xs">
          {(
            [
              ["all", "Vše"],
              ["sog", "Na branku"],
              ["goals", "Góly"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-md px-2.5 py-1 transition ${filter === k ? "bg-surface text-fg shadow-sm" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg viewBox="-101 -43.5 202 87" className="w-full" role="img" aria-label="Mapa střel">
          <Rink />
          {points.map(({ s, home, cx, cy }) => {
            const color = home ? "var(--home)" : "var(--away)";
            const goal = s.type === "goal";
            const missed = s.type === "missed-shot";
            return (
              <circle
                key={s.seq}
                cx={cx}
                cy={cy}
                r={goal ? 2.6 : 1.5}
                fill={goal ? color : missed ? "none" : color}
                fillOpacity={goal ? 1 : 0.45}
                stroke={color}
                strokeWidth={goal ? 0.8 : 0.4}
                strokeOpacity={missed ? 0.7 : 1}
                className="cursor-pointer transition-[r]"
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setHover(s)}
              />
            );
          })}
        </svg>
        {hover ? <ShotTooltip shot={hover} players={players} /> : null}
      </div>
      <p className="mt-2 text-[11px] text-muted">● střela na branku · ○ mimo · velký bod = gól</p>
    </div>
  );
}

const SHOT_LABEL: Record<ShotEvent["type"], string> = {
  goal: "Gól",
  "shot-on-goal": "Střela na branku",
  "missed-shot": "Střela mimo",
  "blocked-shot": "Zblokovaná střela",
};

function ShotTooltip({ shot, players }: { shot: ShotEvent; players: Record<string, NhlPlayerRef> | null }) {
  const shooter = shot.shooterId ? players?.[shot.shooterId] : null;
  const m = Math.floor(shot.periodSeconds / 60);
  const s = String(shot.periodSeconds % 60).padStart(2, "0");
  const dist = shot.x !== null && shot.y !== null ? Math.hypot(89 - shot.x, shot.y) : null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg border border-line bg-surface/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur">
      <div className="font-medium">{SHOT_LABEL[shot.type]}</div>
      <div className="text-muted tabular">
        {shooter ? `${shooter.name} · ` : ""}
        {shot.period}. tř. {m}:{s}
        {shot.shotType ? ` · ${shot.shotType}` : ""}
        {dist !== null ? ` · ${Math.round(dist * 0.3048)} m` : ""}
      </div>
    </div>
  );
}

function Rink() {
  const line = "var(--rink-line)";
  return (
    <g fill="none" strokeWidth={0.5}>
      <rect x={-100} y={-42.5} width={200} height={85} rx={28} fill="var(--rink)" stroke={line} strokeWidth={0.8} />
      <line x1={0} y1={-42.5} x2={0} y2={42.5} stroke="var(--live)" strokeOpacity={0.45} strokeWidth={1} />
      <line x1={-25} y1={-42.5} x2={-25} y2={42.5} stroke="var(--accent)" strokeOpacity={0.45} strokeWidth={1} />
      <line x1={25} y1={-42.5} x2={25} y2={42.5} stroke="var(--accent)" strokeOpacity={0.45} strokeWidth={1} />
      {[-89, 89].map((x) => (
        <g key={x}>
          <line x1={x} y1={-37} x2={x} y2={37} stroke="var(--live)" strokeOpacity={0.35} />
          <path
            d={x > 0 ? `M ${x} -4 A 6 6 0 0 0 ${x} 4` : `M ${x} -4 A 6 6 0 0 1 ${x} 4`}
            fill="var(--accent-soft)"
            stroke={line}
          />
          <rect x={x > 0 ? x : x - 3.3} y={-3} width={3.3} height={6} stroke={line} />
        </g>
      ))}
      <circle cx={0} cy={0} r={15} stroke={line} />
      {[-69, 69].flatMap((x) =>
        [-22, 22].map((y) => (
          <g key={`${x}${y}`}>
            <circle cx={x} cy={y} r={15} stroke={line} />
            <circle cx={x} cy={y} r={0.9} fill={line} stroke="none" />
          </g>
        )),
      )}
      {[-20, 20].flatMap((x) =>
        [-22, 22].map((y) => <circle key={`n${x}${y}`} cx={x} cy={y} r={0.9} fill={line} stroke="none" />),
      )}
    </g>
  );
}
