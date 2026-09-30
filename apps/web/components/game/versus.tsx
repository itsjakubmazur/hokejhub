"use client";

import type { FormResult, Game } from "@hokejhub/core";
import { Info, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Portrait } from "../portrait";
import { TeamLogo } from "../team-logo";

/** Home crest × away crest — the header row of every head-to-head card. */
export function Crests({ game }: { game: Game }) {
  return (
    <div className="flex items-center justify-center gap-4 border-b border-line pb-3">
      <TeamLogo team={game.home} size={36} />
      <X className="size-6 text-muted/60" strokeWidth={3} aria-hidden />
      <TeamLogo team={game.away} size={36} />
    </div>
  );
}

/**
 * One comparison row: home value left, label centred, away value right, and a split bar whose
 * halves are proportional to the two values (reversed when a lower number is better).
 */
export function VersusBar({
  label,
  home,
  away,
  homeText,
  awayText,
  lowerIsBetter = false,
  delay = 0,
}: {
  label: string;
  home: number;
  away: number;
  homeText?: string;
  awayText?: string;
  lowerIsBetter?: boolean;
  delay?: number;
}) {
  const a = Math.max(0, home);
  const b = Math.max(0, away);
  const total = a + b;
  let share = total ? a / total : 0.5;
  if (lowerIsBetter && total) share = b / total;
  const homeLeads = lowerIsBetter ? home < away : home > away;
  const awayLeads = lowerIsBetter ? away < home : away > home;
  return (
    <div className="py-1.5 sm:py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`display text-xl tabular text-home sm:text-2xl ${homeLeads ? "" : "opacity-70"}`}>{homeText ?? home}</span>
        <span className="label text-center text-[10px] text-fg sm:text-[11px]">{label}</span>
        <span className={`display text-xl tabular text-away sm:text-2xl ${awayLeads ? "" : "opacity-70"}`}>{awayText ?? away}</span>
      </div>
      <div className="mt-1 flex h-2 gap-1 sm:mt-1.5 sm:h-2.5">
        <motion.span
          className="h-full origin-right rounded-l-full bg-home"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ width: `${share * 100}%` }}
        />
        <motion.span
          className="h-full flex-1 origin-left rounded-r-full bg-away"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
    </div>
  );
}

const FORM_RING: Record<FormResult, [string, string]> = {
  W: ["V", "border-win text-win"],
  OTW: ["VP", "border-win text-win"],
  T: ["R", "border-muted text-muted"],
  OTL: ["PP", "border-live text-live"],
  L: ["P", "border-live text-live"],
};

/** Form as ringed letters: V / VP / R / PP / P, most recent first. */
export function FormRings({ form, align = "start" }: { form: FormResult[]; align?: "start" | "end" }) {
  return (
    <div className={`flex gap-1 ${align === "end" ? "flex-row-reverse" : ""}`}>
      {form.slice(0, 5).map((f, i) => {
        const [t, cls] = FORM_RING[f];
        return (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 500, damping: 22 }}
            className={`grid size-6 place-items-center rounded-full border-2 text-[9px] font-bold sm:size-7 sm:text-[10px] ${cls}`}
          >
            {t}
          </motion.span>
        );
      })}
    </div>
  );
}

export interface DuelSide {
  id?: string | null;
  name: string;
  photo: string | null;
  sub?: string;
  number?: number | null;
  value: ReactNode;
}

/** Two players face to face under a caption: photo, name, role and the number that matters. */
export function Duel({ title, home, away }: { title?: string; home: DuelSide | null; away: DuelSide | null }) {
  const side = (p: DuelSide | null, s: "home" | "away") =>
    p ? (
      <div className="flex min-w-0 flex-col items-center text-center">
        <Portrait src={p.photo} alt={p.name} width={60} side={s} className="sm:!w-[76px] sm:!h-[101px]" />
        {p.id ? (
          <Link href={`/hrac/${p.id}`} className="mt-1.5 max-w-full truncate text-sm font-semibold hover:text-accent sm:mt-2 sm:text-base">
            {p.number != null ? <b className="mr-1 tabular">{p.number}</b> : null}
            {p.name}
          </Link>
        ) : (
          <span className="mt-1.5 max-w-full truncate text-sm font-semibold sm:mt-2 sm:text-base">{p.name}</span>
        )}
        {p.sub ? <span className="text-xs text-muted">{p.sub}</span> : null}
        <span className={`display mt-0.5 text-xl tabular sm:mt-1 sm:text-2xl ${s === "home" ? "text-home" : "text-away"}`}>{p.value}</span>
      </div>
    ) : (
      <span className="text-center text-sm text-muted">–</span>
    );
  return (
    <div className="border-b border-line py-3 last:border-b-0 sm:py-4">
      {title ? <h3 className="label mb-2 text-center text-[11px] text-fg sm:mb-3">{title}</h3> : null}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {side(home, "home")}
        <X className="size-7 text-muted/50" strokeWidth={3} aria-hidden />
        {side(away, "away")}
      </div>
    </div>
  );
}

/** (i) button that slides up an explanation sheet — how a chart is built and read. */
export function InfoButton({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Vysvětlivka: ${title}`} className="text-muted hover:text-fg">
        <Info className="size-5" aria-hidden />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button type="button" aria-label="Zavřít" className="absolute inset-0 bg-black/55" onClick={() => setOpen(false)} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, i) => i.offset.y > 80 && setOpen(false)}
              className="relative w-full max-w-lg border-t border-line bg-surface px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3 sm:border"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" aria-hidden />
              <h2 className="display text-center text-2xl">{title}</h2>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-fg/85">{children}</div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
