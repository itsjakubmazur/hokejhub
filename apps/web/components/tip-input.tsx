"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Tip } from "@hokejhub/core";
import { saveTip, useTips, type TipEntry } from "@/lib/tips";

function Stepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <span className="inline-flex items-center overflow-hidden rounded-lg border border-line" aria-label={label}>
      <button className="px-1.5 text-muted hover:text-fg" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`${label} −`}>
        −
      </button>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} className="w-5 text-center font-bold tabular">
          {value}
        </motion.span>
      </AnimatePresence>
      <button className="px-1.5 text-muted hover:text-fg" onClick={() => onChange(Math.min(15, value + 1))} aria-label={`${label} +`}>
        +
      </button>
    </span>
  );
}

/** Score tip for an upcoming game, next to the model's own tip. Locks at face-off. */
export function TipInput({ game, model }: { game: Omit<TipEntry, "tip" | "model">; model: Tip }) {
  const tips = useTips();
  const mine = tips[game.gameId];
  const [now] = useState(() => Date.now());
  const locked = Date.parse(game.startAt) <= now;
  const set = (tip: Tip) => saveTip({ ...game, tip, model });
  return (
    <div className="flex items-center gap-2 text-xs">
      {mine ? (
        <>
          <span className="text-muted">Tvůj tip</span>
          {locked ? (
            <span className="font-bold tabular">
              {mine.tip.home}:{mine.tip.away}
            </span>
          ) : (
            <>
              <Stepper label="domácí" value={mine.tip.home} onChange={(v) => set({ ...mine.tip, home: v })} />
              <span>:</span>
              <Stepper label="hosté" value={mine.tip.away} onChange={(v) => set({ ...mine.tip, away: v })} />
              <button className="text-muted hover:text-live" onClick={() => saveTip({ gameId: game.gameId, remove: true })} aria-label="Smazat tip">
                ✕
              </button>
            </>
          )}
        </>
      ) : locked ? null : (
        <button onClick={() => set({ ...model })} className="rounded-lg border border-dashed border-line px-2 py-1 text-muted hover:border-accent hover:text-accent">
          + Tipnout skóre
        </button>
      )}
      <span className="ml-auto text-muted">
        model <b className="tabular text-fg">{model.home}:{model.away}</b>
      </span>
    </div>
  );
}
