"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@hokejhub/core";

/**
 * Banner that sweeps over the match header when a period or the game ends (seen live only):
 * a red goal-light pulse and "KONEC 2. TŘETINY" / "KONEC ZÁPASU".
 */
export function PeriodSiren({ game }: { game: Game }) {
  const prev = useRef(game.status);
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const was = prev.current;
    prev.current = game.status;
    let next: string | null = null;
    if (was === "live" && game.status === "intermission") next = game.period && game.period <= 3 ? `Konec ${game.period}. třetiny` : "Konec prodloužení";
    if ((was === "live" || was === "intermission") && game.status === "final") next = game.decidedIn === "SO" ? "Rozhodnuto po nájezdech" : game.decidedIn === "OT" ? "Konec po prodloužení" : "Konec zápasu";
    if (!next) return;
    setLabel(next);
    const t = setTimeout(() => setLabel(null), 3200);
    return () => clearTimeout(t);
  }, [game.status, game.period, game.decidedIn]);

  return (
    <AnimatePresence>
      {label ? (
        <motion.div
          key={label}
          className="pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-hidden rounded-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-live/25"
            animate={{ opacity: [0, 1, 0.2, 1, 0.2, 0.8, 0] }}
            transition={{ duration: 2.4, ease: "easeInOut" }}
          />
          <motion.div
            initial={{ x: "-120%", skewX: -12 }}
            animate={{ x: "0%", skewX: -12 }}
            exit={{ x: "120%" }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative rounded-xl bg-fg px-6 py-2 text-xl font-black uppercase tracking-widest text-bg shadow-2xl sm:text-3xl"
          >
            {label}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
