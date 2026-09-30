"use client";

import { useQuery } from "@tanstack/react-query";
import { CS, csCount } from "@hokejhub/core";
import { Sparkles } from "lucide-react";
import { ClubLogo } from "../club-logo";
import { api, pointsCls, type Split } from "./api";

/** Three-way bar of what everybody tipped: home win / draw / away win. */
export function SplitBar({ split, className = "" }: { split: Split | undefined; className?: string }) {
  if (!split || split.n === 0) return null;
  const pct = (v: number) => Math.round((v / split.n) * 100);
  return (
    <div className={className} title={`Tipy všech: ${pct(split.home)} / ${pct(split.draw)} / ${pct(split.away)} %`}>
      <div className="flex h-1.5 gap-px overflow-hidden">
        <span className="bg-home transition-[width] duration-500" style={{ width: `${pct(split.home)}%` }} />
        <span className="bg-muted/50 transition-[width] duration-500" style={{ width: `${pct(split.draw)}%` }} />
        <span className="bg-away transition-[width] duration-500" style={{ width: `${pct(split.away)}%` }} />
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-muted tabular">
        <span>{pct(split.home)} %</span>
        <span>{csCount(split.n, CS.tip)}</span>
        <span>{pct(split.away)} %</span>
      </div>
    </div>
  );
}

interface Crowd {
  n: number;
  scores: { score: string; n: number }[];
  tips: { nickname: string; club_logo: string | null; home: number; away: number; joker: boolean; points: number | null }[];
  started: boolean;
}

/** Everybody's tips on one game, shown once it has started. */
export function CrowdTips({ gameId, group }: { gameId: string; group: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["tip", "crowd", gameId, group],
    queryFn: () => api<Crowd>(`crowd?game=${encodeURIComponent(gameId)}${group ? `&group=${group}` : ""}`),
  });
  if (isLoading) return <p className="py-2 text-xs text-muted">Načítám tipy ostatních…</p>;
  if (!data || data.n === 0) return <p className="py-2 text-xs text-muted">Nikdo jiný tenhle zápas netipoval.</p>;
  return (
    <div className="space-y-2 py-2">
      <p className="text-xs text-muted">
        Nejčastější tipy:{" "}
        {data.scores.map((s) => (
          <span key={s.score} className="mr-2 font-semibold text-fg tabular">
            {s.score} <span className="font-normal text-muted">({s.n}×)</span>
          </span>
        ))}
      </p>
      {data.started ? (
        <ul className="grid gap-1 sm:grid-cols-2">
          {data.tips.map((t) => (
            <li key={t.nickname} className="flex items-center gap-2 text-sm">
              <ClubLogo src={t.club_logo} alt="" size={20} />
              <span className="min-w-0 flex-1 truncate">{t.nickname}</span>
              {t.joker ? <Sparkles className="size-3.5 text-gold" aria-label="žolík" /> : null}
              <span className={`px-1.5 text-xs font-semibold tabular ${pointsCls(t.points, t.joker)}`}>
                {t.home}:{t.away}
                {t.points !== null ? ` · ${t.points}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">Jednotlivé tipy uvidíš po začátku zápasu.</p>
      )}
    </div>
  );
}
