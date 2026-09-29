"use client";

import { animate, useInView, useMotionValue, useTransform, motion } from "motion/react";
import { useEffect, useRef } from "react";

/** Number that counts up when scrolled into view; keeps the final formatting (cs-CZ). */
export function CountUp({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${v.toLocaleString("cs-CZ", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`);
  useEffect(() => {
    if (!inView) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const c = animate(mv, value, { duration: reduce ? 0 : 0.9, ease: [0.2, 0.8, 0.2, 1] });
    return () => c.stop();
  }, [inView, value, mv]);
  return <motion.span ref={ref}>{text}</motion.span>;
}
