"use client";

import type { Game } from "@hokejhub/core";
import { motion } from "motion/react";
import { Crests } from "./versus";

const R = 100;
const pt = (v: number, r = R) => {
  // 0 → left (180°), 100 → right (0°)
  const a = Math.PI * (1 - v / 100);
  // Rounded so server and browser print identical attributes (no hydration mismatch).
  const round = (n: number) => Math.round(n * 100) / 100;
  return [round(Math.cos(a) * r), round(-Math.sin(a) * r)] as const;
};
const arc = (from: number, to: number, r = R) => {
  const [x1, y1] = pt(from, r);
  const [x2, y2] = pt(to, r);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
};

/** Speedometer of the pre-game chance to win (incl. overtime): home share in home colour. */
export function WinGauge({ game, homeWin }: { game: Game; homeWin: number }) {
  const p = Math.round(homeWin * 100);
  const needle = pt(p, 78);
  return (
    <div>
      <Crests game={game} />
      <div className="mt-3 flex items-baseline justify-between">
        <span className="display text-3xl tabular text-home">{p} %</span>
        <span className="label text-[11px] text-fg">Předpoklad výhry</span>
        <span className="display text-3xl tabular text-away">{100 - p} %</span>
      </div>
      <svg
        viewBox="-118 -118 236 128"
        className="mx-auto mt-2 w-full max-w-md"
        aria-label={`${game.home.shortName} ${p} %, ${game.away.shortName} ${100 - p} %`}
      >
        {Array.from({ length: 50 }, (_, i) => {
          const [x1, y1] = pt(i * 2 + 1, 60);
          const [x2, y2] = pt(i * 2 + 1, 70);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border)" strokeWidth="0.8" />;
        })}
        <motion.path
          d={arc(0, p)}
          fill="none"
          stroke="var(--home)"
          strokeWidth="14"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        />
        <motion.path
          d={arc(p, 100)}
          fill="none"
          stroke="var(--away)"
          strokeWidth="14"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        />
        {Array.from({ length: 11 }, (_, i) => {
          const [x1, y1] = pt(i * 10, 93);
          const [x2, y2] = pt(i * 10, 107);
          const [tx, ty] = pt(i * 10, 82);
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--surface)" strokeWidth="2.5" />
              <text x={tx} y={ty + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--text)">
                {i * 10}
              </text>
            </g>
          );
        })}
        <motion.line
          x1="0"
          y1="0"
          initial={{ x2: -78, y2: 0 }}
          whileInView={{ x2: needle[0], y2: needle[1] }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 50, damping: 8, delay: 0.3 }}
          stroke="var(--text)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="0" cy="0" r="6" fill="var(--surface)" stroke="var(--text)" strokeWidth="2.5" />
      </svg>
    </div>
  );
}
