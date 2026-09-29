"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Full-card goal animation: a puck flies into the net, the net ripples and "GÓL!" slams in,
 * tinted with the scoring team's colour. Triggered by bumping `trigger`.
 */
export function GoalCelebration({ trigger, side, team }: { trigger: number; side: "home" | "away"; team: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (trigger === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- replay the animation on each goal
    setShow(true);
    const t = setTimeout(() => setShow(false), 2600);
    return () => clearTimeout(t);
  }, [trigger]);

  const color = side === "home" ? "var(--home)" : "var(--away)";
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key={trigger}
          className="pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-hidden rounded-3xl"
          style={{ background: `radial-gradient(circle at 50% 55%, color-mix(in oklab, ${color} 35%, transparent), transparent 70%)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          <svg viewBox="0 0 200 110" className="absolute bottom-2 h-2/3 opacity-90" aria-hidden>
            {/* net */}
            <motion.g
              initial={{ scaleY: 1 }}
              animate={{ scaleY: [1, 1, 1.08, 0.97, 1] }}
              transition={{ duration: 0.9, times: [0, 0.45, 0.6, 0.8, 1] }}
              style={{ originY: 1, originX: 0.5 }}
            >
              <path d="M60 100 V45 Q100 25 140 45 V100" fill="none" stroke="var(--live)" strokeWidth="4" strokeLinecap="round" />
              {[70, 80, 90, 100, 110, 120, 130].map((x) => (
                <line key={x} x1={x} y1={38} x2={x} y2={100} stroke="var(--text)" strokeOpacity=".25" />
              ))}
              {[52, 64, 76, 88].map((y) => (
                <line key={y} x1={62} y1={y} x2={138} y2={y} stroke="var(--text)" strokeOpacity=".25" />
              ))}
            </motion.g>
            {/* puck */}
            <motion.ellipse
              rx="7"
              ry="3"
              fill="var(--text)"
              initial={{ cx: -20, cy: 108, scale: 1.6 }}
              animate={{ cx: 100, cy: 80, scale: 0.8 }}
              transition={{ duration: 0.45, ease: [0.3, 0.1, 0.2, 1] }}
            />
            {/* ice spray */}
            {[...Array(10)].map((_, i) => (
              <motion.circle
                key={i}
                r="1.6"
                fill="var(--accent)"
                initial={{ cx: 100, cy: 80, opacity: 0 }}
                animate={{ cx: 100 + Math.cos((i / 10) * Math.PI * 2) * 45, cy: 80 + Math.sin((i / 10) * Math.PI * 2) * 25, opacity: [0, 1, 0] }}
                transition={{ delay: 0.45, duration: 0.7 }}
              />
            ))}
          </svg>
          <motion.div
            className="relative text-center"
            initial={{ scale: 3, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: -4 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 420, damping: 16 }}
          >
            <div className="text-6xl font-black italic tracking-tight drop-shadow-lg sm:text-7xl" style={{ color }}>
              GÓL!
            </div>
            <div className="mt-1 text-sm font-bold uppercase tracking-widest">{team}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
