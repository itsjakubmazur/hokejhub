"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/** Page transition: each navigation glides in like a puck across the ice. */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}
