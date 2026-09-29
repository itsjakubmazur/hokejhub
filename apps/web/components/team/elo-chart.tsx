"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";

/** Team Elo rating over its whole history, with league-average line and season peaks. */
export function EloChart({ points, leagueBest }: { points: [string, number][]; leagueBest: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = 220;
  const pad = { l: 36, r: 8, t: 10, b: 22 };
  const { path, xs, ys, min, max, years, peak } = useMemo(() => {
    const vals = points.map((p) => p[1]);
    const min = Math.min(1400, ...vals) - 10;
    const max = Math.max(1600, ...vals) + 10;
    const t0 = Date.parse(points[0]![0]);
    const t1 = Date.parse(points.at(-1)![0]);
    const x = (t: number) => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
    const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
    const xs = points.map((p) => x(Date.parse(p[0])));
    const ys = points.map((p) => y(p[1]));
    const path = xs.map((px, i) => `${i ? "L" : "M"}${px.toFixed(1)},${ys[i]!.toFixed(1)}`).join("");
    const years: { x: number; label: string }[] = [];
    const first = new Date(t0).getFullYear();
    const last = new Date(t1).getFullYear();
    const step = Math.max(1, Math.ceil((last - first) / 8));
    for (let yr = first + 1; yr <= last; yr += step) years.push({ x: x(Date.UTC(yr, 0, 1)), label: String(yr) });
    let peak = 0;
    vals.forEach((v, i) => (v > vals[peak]! ? (peak = i) : null));
    return { path, xs, ys, min, max, years, peak, y };
  }, [points, pad.b, pad.l, pad.r, pad.t]);
  const y1500 = pad.t + (1 - (1500 - min) / (max - min)) * (H - pad.t - pad.b);
  const h = hover ?? points.length - 1;

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-4 text-sm">
        <span>
          <span className="text-muted">Rating </span>
          <b className="tabular">{points[h]![1]}</b>
          <span className="ml-1 text-xs text-muted">{new Date(points[h]![0]).toLocaleDateString("cs-CZ")}</span>
        </span>
        <span className="text-xs text-muted">
          maximum {points[peak]![1]} ({new Date(points[peak]![0]).getFullYear()}) · nejlepší tým ligy dnes {Math.round(leagueBest)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          let best = 0;
          for (let i = 0; i < xs.length; i++) if (Math.abs(xs[i]! - px) < Math.abs(xs[best]! - px)) best = i;
          setHover(best);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {[1400, 1500, 1600].filter((v) => v > min && v < max).map((v) => {
          const yy = pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
          return (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={yy} y2={yy} stroke="var(--line)" strokeDasharray={v === 1500 ? "" : "3 4"} />
              <text x={pad.l - 6} y={yy + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
                {v}
              </text>
            </g>
          );
        })}
        {years.map((t) => (
          <text key={t.label} x={t.x} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">
            {t.label}
          </text>
        ))}
        <defs>
          <clipPath id="elo-above">
            <rect x="0" y="0" width={W} height={y1500} />
          </clipPath>
          <clipPath id="elo-below">
            <rect x="0" y={y1500} width={W} height={H} />
          </clipPath>
        </defs>
        <path d={`${path}L${xs.at(-1)},${y1500}L${xs[0]},${y1500}Z`} fill="var(--win)" opacity="0.15" clipPath="url(#elo-above)" />
        <path d={`${path}L${xs.at(-1)},${y1500}L${xs[0]},${y1500}Z`} fill="var(--live)" opacity="0.12" clipPath="url(#elo-below)" />
        <motion.path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: "easeInOut" }} />
        <circle cx={xs[peak]} cy={ys[peak]} r="4" fill="var(--gold)" stroke="var(--surface)" strokeWidth="2" />
        <line x1={xs[h]} x2={xs[h]} y1={pad.t} y2={H - pad.b} stroke="var(--muted)" strokeOpacity=".5" />
        <circle cx={xs[h]} cy={ys[h]} r="4.5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
      </svg>
      <p className="mt-1 text-[11px] text-muted">1500 = průměr ligy. Zelená plocha = nadprůměr, červená = podprůměr. Zlatý bod = historické maximum.</p>
    </div>
  );
}
