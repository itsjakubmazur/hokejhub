"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Page transition: the page slides in from the side and stops dead, like a hockey stop. Opacity
 * and a few pixels of travel only — skewing a whole page re-rasterised every glyph on phones.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0.6, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
