"use client";

import { Star } from "lucide-react";
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
      className={`relative inline-flex items-center gap-1.5 border px-3 py-1 text-xs font-semibold transition-colors ${
        on ? "border-gold bg-gold/15 text-gold" : "border-line text-muted hover:text-fg"
      }`}
    >
      <motion.span className="inline-flex" animate={on ? { scale: [1, 1.5, 1], rotate: [0, 72, 0] } : { scale: 1 }} transition={{ duration: 0.45 }}>
        <Star className={`size-4 ${on ? "fill-current" : ""}`} aria-hidden />
      </motion.span>
      {on ? "Oblíbený" : "Sledovat"}
      <AnimatePresence>
        {on ? (
          <motion.span
            key="burst"
            initial={{ opacity: 0.8, scale: 0.4 }}
            animate={{ opacity: 0, scale: 2.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="pointer-events-none absolute inset-0 border-2 border-gold"
          />
        ) : null}
      </AnimatePresence>
    </button>
  );
}
