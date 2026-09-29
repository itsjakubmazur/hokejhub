"use client";

import { motion } from "motion/react";
import { matchRecap, type HokejczMatch } from "@hokejhub/core";

/** Auto-written match report (rule-based, from the box score). */
export function Recap({ box, xg, homeWinProb }: { box: HokejczMatch; xg: number[] | null; homeWinProb: number | null }) {
  const lines = matchRecap(box, { xg: xg ? [xg[0]!, xg[1]!] : null, homeWinProb });
  if (lines.length === 0) return null;
  const [headline, ...rest] = lines;
  return (
    <div>
      <p className="text-lg font-bold leading-snug">{headline}</p>
      <div className="mt-2 space-y-1 text-sm leading-relaxed text-fg/85">
        {rest.map((l, i) => (
          <motion.p key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
            {l}
          </motion.p>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted">Automaticky sestaveno z dat zápasu.</p>
    </div>
  );
}
