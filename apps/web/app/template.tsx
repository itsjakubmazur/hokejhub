"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/** Page transition: a hockey stop — the page skates in from the side and digs its edges in. */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0.4, x: 18, skewX: -2 }}
      animate={{ opacity: 1, x: 0, skewX: 0 }}
      transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.6 }}
    >
      {children}
    </motion.div>
  );
}
