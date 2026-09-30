"use client";

import { useQuery } from "@tanstack/react-query";
import { Award, Bot, Crosshair, Flame, Lock, Shield, Sparkles, Star, Target, Ticket, Trophy, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { Card, Empty } from "../ui/card";
import { CountUp } from "../ui/count-up";
import { api } from "./api";

interface Stats {
  tips: number;
  points: number;
  model: number;
  exact: number;
  accuracy: number | null;
  streak: number;
  bestStreak: number;
  bestDay: { date: string; points: number } | null;
  dayWins: number;
  badges: { id: string; title: string; text: string; earned: boolean }[];
}

const BADGE_ICON: Record<string, LucideIcon> = {
  "first-exact": Crosshair,
  sniper: Target,
  streak5: Flame,
  streak10: Zap,
  machine: Bot,
  joker: Sparkles,
  day: Star,
  loyal: Ticket,
};

/** Personal numbers and achievements at the top of "Moje tipy". */
export function MyStats() {
  const { data, isLoading } = useQuery({ queryKey: ["tip", "stats"], queryFn: () => api<Stats>("stats") });
  if (isLoading || !data) return null;
  if (data.tips === 0)
    return (
      <Card title="Moje statistiky" icon={Award}>
        <Empty>Statistiky a odznaky se objeví po prvním vyhodnoceném tipu.</Empty>
      </Card>
    );
  const figures: [string, React.ReactNode, string?][] = [
    ["Body", <CountUp key="p" value={data.points} />, `model ${data.model}`],
    ["Přesně", data.exact, `z ${data.tips} tipů`],
    ["Úspěšnost", data.accuracy !== null ? `${Math.round(data.accuracy * 100)} %` : "–", "uhodnutý vítěz"],
    ["Série", data.streak, `rekord ${data.bestStreak}`],
    ["Nejlepší den", data.bestDay?.points ?? "–", data.bestDay ? new Date(data.bestDay.date).toLocaleDateString("cs-CZ") : undefined],
    ["Tipér dne", `${data.dayWins}×`, "nejlepší ze všech"],
  ];
  return (
    <Card title="Moje statistiky" icon={Award}>
      <div className="grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-6">
        {figures.map(([label, value, sub]) => (
          <div key={label}>
            <div className="label text-muted">{label}</div>
            <div className="display mt-1 text-3xl tabular">{value}</div>
            {sub ? <div className="text-[11px] text-muted">{sub}</div> : null}
          </div>
        ))}
      </div>
      <h3 className="label mb-3 mt-6 text-fg">Odznaky</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.badges.map((b, i) => {
          const Icon = BADGE_ICON[b.id] ?? Shield;
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 320, damping: 20 }}
              className={`flex items-center gap-3 border p-2.5 ${b.earned ? "border-gold/60 bg-gold/10" : "border-line opacity-55"}`}
            >
              <span className={`grid size-10 shrink-0 place-items-center ${b.earned ? "bg-gold text-black" : "bg-surface-2 text-muted"}`}>
                {b.earned ? <Icon className="size-5" aria-hidden /> : <Lock className="size-4" aria-hidden />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{b.title}</span>
                <span className="block text-[11px] leading-tight text-muted">{b.text}</span>
              </span>
            </motion.div>
          );
        })}
      </div>
      {data.badges.every((b) => b.earned) ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-gold">
          <Trophy className="size-4" aria-hidden /> Sbírka kompletní.
        </p>
      ) : null}
    </Card>
  );
}
