"use client";

import { AnimatePresence, motion } from "motion/react";
import { useFavorites } from "@/lib/favorites";

export function FavoriteButton({ id, label, names }: { id: string; label: string; names: string[] }) {
  const { has, toggle } = useFavorites();
  const on = has(id);
  return (
    <button
      onClick={() => toggle({ id, names })}
      aria-pressed={on}
      title={on ? `Odebrat ${label} z oblíbených` : `Přidat ${label} do oblíbených`}
      className={`relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        on ? "border-gold bg-gold/15 text-gold" : "border-line text-muted hover:text-fg"
      }`}
    >
      <motion.svg viewBox="0 0 24 24" className="size-4" animate={on ? { scale: [1, 1.5, 1], rotate: [0, 72, 0] } : { scale: 1 }} transition={{ duration: 0.45 }}>
        <path
          d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </motion.svg>
      {on ? "Oblíbený" : "Sledovat"}
      <AnimatePresence>
        {on ? (
          <motion.span
            key="burst"
            initial={{ opacity: 0.8, scale: 0.4 }}
            animate={{ opacity: 0, scale: 2.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-gold"
          />
        ) : null}
      </AnimatePresence>
    </button>
  );
}
