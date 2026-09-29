"use client";

import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { xgFlow, type Game, type ShotEvent } from "@hokejhub/core";

const W = 640;
const H = 220;
const PAD = { l: 34, r: 56, t: 14, b: 26 };

/** Cumulative xG over game time (step lines), goals marked, crosshair tooltip on hover. */
export function XgFlow({ game, shots }: { game: Game; shots: ShotEvent[] }) {
  const points = useMemo(() => xgFlow(shots, game.home.id), [shots, game.home.id]);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const last = points.at(-1)!;
  const maxT = Math.max(3600, last.t + 30);
  const maxY = Math.max(1, Math.ceil(Math.max(last.home, last.away) * 1.15 * 2) / 2);
  const x = (t: number) => PAD.l + (t / maxT) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / maxY) * (H - PAD.t - PAD.b);

  const path = (key: "home" | "away") => {
    let d = `M${x(0)},${y(0)}`;
    let prev = 0;
    for (const p of points) {
      d += ` H${x(p.t)} V${y(p[key])}`;
      prev = p[key];
    }
    return `${d} H${x(maxT)} V${y(prev)}`;
  };

  const yTicks = Array.from({ length: Math.floor(maxY / 0.5) + 1 }, (_, i) => i * 0.5).filter((v) => v <= maxY);
  const at = (t: number) => {
    let cur = points[0]!;
    for (const p of points) if (p.t <= t) cur = p;
    return cur;
  };
  const hoverPoint = hover !== null ? at(hover) : null;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const t = Math.min(maxT, Math.max(0, ((px - PAD.l) / (W - PAD.l - PAD.r)) * maxT));
    setHover(t);
  }

  const label = (key: "home" | "away") => (
    <text x={x(maxT) + 6} y={y(last[key]) + 4} className="fill-[var(--text)] text-[11px] font-semibold tabular">
      {last[key].toFixed(2)}
    </text>
  );

  return (
    <figure>
      <div className="mb-2 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-home" /> {game.home.shortName}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-away" /> {game.away.shortName}
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <span className="size-2 rounded-full border-2 border-current" /> gól
        </span>
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`Průběh očekávaných gólů: ${game.home.shortName} ${last.home.toFixed(2)}, ${game.away.shortName} ${last.away.toFixed(2)}`}
        >
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--border)" />
              <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" className="fill-[var(--muted)] text-[10px] tabular">
                {v.toFixed(1)}
              </text>
            </g>
          ))}
          {[0, 1200, 2400, 3600].filter((t) => t <= maxT).map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={PAD.t} y2={H - PAD.b} stroke="var(--border)" strokeDasharray={t % 1200 === 0 && t > 0 ? "3 3" : undefined} />
              <text x={x(t)} y={H - 8} textAnchor="middle" className="fill-[var(--muted)] text-[10px] tabular">
                {t / 60}′
              </text>
            </g>
          ))}
          {(["home", "away"] as const).map((k) => (
            <motion.path
              key={k}
              d={path(k)}
              fill="none"
              stroke={`var(--${k})`}
              strokeWidth={2}
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
            />
          ))}
          {points
            .filter((p) => p.goal)
            .map((p, i) => (
              <motion.circle
                key={i}
                cx={x(p.t)}
                cy={y(p[p.goal!])}
                r={5}
                fill="var(--surface)"
                stroke={`var(--${p.goal})`}
                strokeWidth={2.5}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.2 + i * 0.08, type: "spring", stiffness: 400 }}
              />
            ))}
          {label("home")}
          {label("away")}
          {hoverPoint && hover !== null ? (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--muted)" strokeWidth={1} />
          ) : null}
        </svg>
        {hoverPoint && hover !== null ? (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-line bg-surface/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur"
            style={{ left: `${(x(hover) / W) * 100}%` }}
          >
            <div className="mb-0.5 font-semibold tabular">{Math.floor(hover / 60)}′</div>
            <div className="flex items-center gap-1.5 tabular">
              <span className="size-2 rounded-full bg-home" />
              {game.home.abbrev} <span className="font-semibold">{hoverPoint.home.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5 tabular">
              <span className="size-2 rounded-full bg-away" />
              {game.away.abbrev} <span className="font-semibold">{hoverPoint.away.toFixed(2)}</span>
            </div>
          </div>
        ) : null}
      </div>
    </figure>
  );
}
