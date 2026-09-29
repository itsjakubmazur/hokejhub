"use client";

import { motion } from "motion/react";
import { useState } from "react";

export interface Bar {
  key: string;
  label: string;
  value: number;
  /** Optional secondary value shown in the tooltip (e.g. fill %). */
  note?: string;
  highlight?: boolean;
}

/** Single-series vertical bar chart with hover tooltip (one hue, highlighted bar optional). */
export function BarChart({ bars, format = (v) => v.toLocaleString("cs-CZ"), height = 180 }: { bars: Bar[]; format?: (v: number) => string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  return (
    <div className="relative">
      <div className="flex gap-2" style={{ height }}>
        <div className="flex flex-col justify-between pb-5 text-right text-[10px] text-muted tabular">
          {[...ticks].reverse().map((t) => (
            <span key={t}>{format(t)}</span>
          ))}
        </div>
        <div className="relative flex flex-1 items-end gap-[2px] border-b border-line pb-0">
          {[0.5, 1].map((f) => (
            <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-line" style={{ bottom: `calc(${f * 100}% - ${f * 20}px + 20px)` }} />
          ))}
          {bars.map((b, i) => (
            <div
              key={b.key}
              className="group relative flex h-full flex-1 flex-col justify-end pb-5"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            >
              <motion.div
                className={`w-full rounded-t-[4px] ${b.highlight ? "bg-accent" : hover === i ? "bg-accent" : "bg-accent/55"}`}
                initial={{ height: 0 }}
                animate={{ height: `${(b.value / max) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.015, ease: [0.2, 0.8, 0.2, 1] }}
              />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-muted">
                {bars.length > 14 && i % 3 !== 0 ? "" : b.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      {hover !== null ? (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line bg-surface/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur"
          style={{ left: `calc(${((hover + 0.5) / bars.length) * 100}% + 20px)` }}
        >
          <div className="font-semibold">{bars[hover]!.label}</div>
          <div className="tabular">{format(bars[hover]!.value)}</div>
          {bars[hover]!.note ? <div className="text-muted">{bars[hover]!.note}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
