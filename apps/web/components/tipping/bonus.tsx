"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CS, csCount } from "@hokejhub/core";
import { Check, Lock, Medal, X } from "lucide-react";
import { motion } from "motion/react";
import { ClubLogo } from "../club-logo";
import { Card, Empty } from "../ui/card";
import { api } from "./api";

interface Question {
  id: string;
  league_key: string;
  title: string;
  options: { id: string; name: string; logo: string | null }[];
  points: number;
  locks_at: string;
  locked: boolean;
  answer: string | null;
  mine: string | null;
  picks: Record<string, number> | null;
}

const lockLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Prague" });

/** Season-long picks: champion, regular-season winner, last place, Stanley Cup. */
export function BonusQuestions({ loggedIn }: { loggedIn: boolean }) {
  const { data, isLoading } = useQuery({ queryKey: ["tip", "bonus"], queryFn: () => api<{ questions: Question[] }>("bonus") });
  if (isLoading)
    return (
      <Card>
        <Empty>Načítám otázky…</Empty>
      </Card>
    );
  const qs = data?.questions ?? [];
  if (qs.length === 0)
    return (
      <Card>
        <Empty>Dlouhodobé otázky pro tuhle sezónu ještě nejsou připravené.</Empty>
      </Card>
    );
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Tipy na celou sezónu. Body se přičtou do celkového žebříčku, až bude jasno. Do uzávěrky můžeš volbu kdykoli změnit.
      </p>
      {qs.map((q) => (
        <QuestionCard key={q.id} q={q} loggedIn={loggedIn} />
      ))}
    </div>
  );
}

function QuestionCard({ q, loggedIn }: { q: Question; loggedIn: boolean }) {
  const qc = useQueryClient();
  const pick = useMutation({
    mutationFn: (value: string) => api("bonus", { method: "POST", body: { questionId: q.id, value } }),
    onMutate: async (value) => {
      qc.setQueryData<{ questions: Question[] }>(["tip", "bonus"], (d) =>
        d ? { questions: d.questions.map((x) => (x.id === q.id ? { ...x, mine: value } : x)) } : d,
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tip", "bonus"] }),
  });
  const total = Object.values(q.picks ?? {}).reduce((s, n) => s + n, 0);
  const disabled = q.locked || !loggedIn;
  const hit = q.answer && q.mine === q.answer;
  return (
    <Card
      title={q.title}
      icon={Medal}
      action={
        <span className="flex items-center gap-2 text-xs text-muted">
          <span className="display text-base text-fg">{csCount(q.points, CS.bod)}</span>
          {q.locked ? (
            <span className="flex items-center gap-1">
              <Lock className="size-3" aria-hidden /> uzavřeno
            </span>
          ) : (
            <span>do {lockLabel(q.locks_at)}</span>
          )}
        </span>
      }
    >
      {q.answer ? (
        <p className={`mb-3 flex items-center gap-2 text-sm font-semibold ${hit ? "text-win" : "text-muted"}`}>
          {hit ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
          {hit ? `Trefa! +${q.points} b.` : `Správně: ${q.options.find((o) => o.id === q.answer)?.name ?? q.answer}`}
        </p>
      ) : null}
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-8">
        {q.options.map((o) => {
          const mine = q.mine === o.id;
          const right = q.answer === o.id;
          const share = total ? (q.picks?.[o.id] ?? 0) / total : 0;
          return (
            <motion.button
              key={o.id}
              type="button"
              disabled={disabled}
              whileTap={{ scale: 0.92 }}
              onClick={() => pick.mutate(o.id)}
              title={o.name}
              className={`relative flex flex-col items-center gap-1.5 overflow-hidden border p-2 text-center transition ${
                right ? "border-gold ring-2 ring-gold" : mine ? "border-accent ring-2 ring-accent" : "border-line"
              } ${disabled && !mine && !right ? "opacity-60" : "hover:border-fg"}`}
            >
              {q.locked && total ? (
                <span className="absolute inset-x-0 bottom-0 bg-accent/12" style={{ height: `${share * 100}%` }} aria-hidden />
              ) : null}
              <span className="relative grid size-12 place-items-center bg-white p-1">
                <ClubLogo src={o.logo} alt="" size={40} />
              </span>
              <span className="relative line-clamp-2 text-[11px] font-medium leading-tight">{o.name}</span>
              {q.locked && total ? <span className="relative text-[10px] text-muted tabular">{Math.round(share * 100)} %</span> : null}
              {mine ? (
                <motion.span
                  layoutId={`pick-${q.id}`}
                  className="absolute right-1 top-1 grid size-4 place-items-center bg-accent text-white"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Check className="size-3" aria-hidden />
                </motion.span>
              ) : null}
            </motion.button>
          );
        })}
      </div>
      {pick.error ? <p className="mt-2 text-sm text-live">{(pick.error as Error).message}</p> : null}
      {!loggedIn ? <p className="mt-2 text-xs text-muted">Pro tipování se přihlas.</p> : null}
    </Card>
  );
}
