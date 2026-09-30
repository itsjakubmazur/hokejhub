"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/** Page transition: each navigation glides in like a puck across the ice. */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
      {children}
    </motion.div>
  );
}
