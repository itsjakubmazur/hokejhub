"use client";

import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { liveWinProbability, type Game } from "@hokejhub/core";

const W = 640;
const H = 180;
const PAD = { l: 34, r: 12, t: 10, b: 24 };

/** Home win probability over the game, recomputed after every goal and each 30 s of play. */
export function WinProbability({
  game,
  goals,
  expHome,
  expAway,
  elapsedNow,
}: {
  game: Game;
  /** Goals as [elapsed seconds, "home" | "away"]. */
  goals: [number, "home" | "away"][];
  expHome: number;
  expAway: number;
  elapsedNow: number;
}) {
  const end = Math.min(Math.max(elapsedNow, 60), 3600);
  const points = useMemo(() => {
    const sorted = [...goals].sort((a, b) => a[0] - b[0]);
    const out: { t: number; p: number }[] = [];
    for (let t = 0; t <= end; t += 30) {
      const h = sorted.filter(([s, side]) => s <= t && side === "home").length;
      const a = sorted.filter(([s, side]) => s <= t && side === "away").length;
      out.push({ t, p: liveWinProbability(h, a, t, expHome, expAway) });
    }
    return out;
  }, [goals, end, expHome, expAway]);
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const x = (t: number) => PAD.l + (t / 3600) * (W - PAD.l - PAD.r);
  const y = (p: number) => PAD.t + (1 - p) * (H - PAD.t - PAD.b);
  const line = points.map((pt, i) => `${i ? "L" : "M"}${x(pt.t)},${y(pt.p)}`).join(" ");
  const area = `${line} L${x(points.at(-1)!.t)},${y(0.5)} L${x(0)},${y(0.5)} Z`;
  const hp = hover !== null ? points[Math.min(points.length - 1, Math.round(hover / 30))] : null;
  return (
    <figure>
      <div className="mb-2 flex justify-between text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-home" /> {game.home.shortName} vyhraje
        </span>
        <span className="flex items-center gap-1.5">
          {game.away.shortName} vyhraje <span className="size-2 rounded-full bg-away" />
        </span>
      </div>
      <div className="relative">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none"
          onPointerMove={(e) => {
            const r = ref.current!.getBoundingClientRect();
            const t = (((e.clientX - r.left) / r.width) * W - PAD.l) / (W - PAD.l - PAD.r) * 3600;
            setHover(Math.max(0, Math.min(end, t)));
          }}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label="Pravděpodobnost výhry v průběhu zápasu"
        >
          <defs>
            <clipPath id="wp-top">
              <rect x="0" y="0" width={W} height={y(0.5)} />
            </clipPath>
            <clipPath id="wp-bottom">
              <rect x="0" y={y(0.5)} width={W} height={H} />
            </clipPath>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <g key={p}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(p)} y2={y(p)} stroke="var(--border)" strokeDasharray={p === 0.5 ? "4 3" : undefined} />
              <text x={PAD.l - 6} y={y(p) + 3} textAnchor="end" className="fill-[var(--muted)] text-[10px] tabular">
                {Math.round(p * 100)}
              </text>
            </g>
          ))}
          {[1200, 2400].map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={PAD.t} y2={H - PAD.b} stroke="var(--border)" strokeDasharray="3 3" />
          ))}
          {[0, 20, 40, 60].map((m) => (
            <text key={m} x={x(m * 60)} y={H - 7} textAnchor="middle" className="fill-[var(--muted)] text-[10px]">
              {m}′
            </text>
          ))}
          <motion.path d={area} fill="var(--home)" fillOpacity={0.18} clipPath="url(#wp-top)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
          <motion.path d={area} fill="var(--away)" fillOpacity={0.18} clipPath="url(#wp-bottom)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
          <motion.path d={line} fill="none" stroke="var(--text)" strokeWidth={2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} />
          {goals.map(([t, side], i) => (
            <circle key={i} cx={x(t)} cy={y(points[Math.min(points.length - 1, Math.ceil(t / 30))]?.p ?? 0.5)} r={4} fill="var(--surface)" stroke={`var(--${side})`} strokeWidth={2.5} />
          ))}
          {hp ? <line x1={x(hp.t)} x2={x(hp.t)} y1={PAD.t} y2={H - PAD.b} stroke="var(--muted)" /> : null}
        </svg>
        {hp ? (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-line bg-surface/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur"
            style={{ left: `${(x(hp.t) / W) * 100}%` }}
          >
            <div className="font-semibold tabular">{Math.floor(hp.t / 60)}′</div>
            <div className="tabular">
              {game.home.abbrev} {Math.round(hp.p * 100)} % · {game.away.abbrev} {Math.round((1 - hp.p) * 100)} %
            </div>
          </div>
        ) : null}
      </div>
    </figure>
  );
}
