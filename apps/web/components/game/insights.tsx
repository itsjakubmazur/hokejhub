"use client";

import { Award, CircleCheck, House, MapPin, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { Game } from "@hokejhub/core";
import type { GameDetailResponse } from "@/lib/types";
import { FormBadges } from "../league/standings";
import { Portrait } from "../portrait";
import { TeamLogo } from "../team-logo";
import { CS, csCount } from "@hokejhub/core";

const MILESTONE: Record<string, (v: number) => string> = {
  career_gp: (v) => `${v}. zápas v extralize`,
  club_gp: (v) => `${v}. zápas za klub`,
  career_g: (v) => `${v}. gól v extralize`,
  club_g: (v) => `${v}. gól za klub`,
  career_pts: (v) => `${v}. bod v extralize`,
  club_pts: (v) => `${v}. bod za klub`,
};

type Streaks = NonNullable<GameDetailResponse["insights"]>["home"];

function streakItems(s: Streaks): { icon: LucideIcon; text: string; tone: "good" | "bad" }[] {
  const out: { icon: LucideIcon; text: string; tone: "good" | "bad" }[] = [];
  if (s.wins >= 2) out.push({ icon: TrendingUp, text: `${csCount(s.wins, CS.vyhra)} v řadě`, tone: "good" });
  if (s.losses >= 2) out.push({ icon: TrendingDown, text: `${csCount(s.losses, CS.prohra)} v řadě`, tone: "bad" });
  if (s.points >= 3 && s.wins < s.points) out.push({ icon: CircleCheck, text: `bodoval ${s.points}× v řadě`, tone: "good" });
  if (s.homeWins >= 3) out.push({ icon: House, text: `doma vyhrál ${s.homeWins}× v řadě`, tone: "good" });
  if (s.awayWins >= 3) out.push({ icon: MapPin, text: `venku vyhrál ${s.awayWins}× v řadě`, tone: "good" });
  return out;
}

export function Insights({ game, data }: { game: Game; data: GameDetailResponse }) {
  const ins = data.insights;
  if (!ins || !data.teamIds) return null;
  const teams = [
    { side: "home" as const, team: game.home, s: ins.home, id: data.teamIds.home },
    { side: "away" as const, team: game.away, s: ins.away, id: data.teamIds.away },
  ];
  const sideOf = (teamId: string): "home" | "away" => (teamId === data.teamIds!.home ? "home" : "away");
  // One card per player: merge several notes about the same player.
  const notesBy = (side: "home" | "away") => {
    const map = new Map<string, { player_id: string; name: string; photo: string | null | undefined; texts: string[] }>();
    for (const n of ins.notes.filter((x) => sideOf(x.team_id) === side)) {
      const e = map.get(n.player_id) ?? { player_id: n.player_id, name: n.name, photo: n.headshot ?? data.photos?.[n.player_id], texts: [] };
      e.texts.push(n.text);
      map.set(n.player_id, e);
    }
    return [...map.values()].slice(0, 4);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {teams.map(({ side, team, s }) => {
          const items = streakItems(s);
          return (
            <div key={side} className="border border-line p-2.5 sm:p-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="grid size-9 shrink-0 place-items-center bg-white p-1 sm:size-11">
                  <TeamLogo team={team} size={36} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="display truncate text-base sm:text-xl">{team.shortName}</div>
                  <FormBadges form={s.last10.slice(0, 5) as never} />
                </div>
              </div>
              <ul className="mt-2 space-y-1 text-[13px] sm:mt-3 sm:space-y-1.5 sm:text-sm">
                {items.map(({ icon: Icon, text, tone }) => (
                  <li key={text} className="flex items-center gap-2">
                    <Icon className={`size-4 shrink-0 ${tone === "good" ? "text-win" : "text-live"}`} strokeWidth={2.25} aria-hidden />
                    {text}
                  </li>
                ))}
                {items.length === 0 ? <li className="text-muted">Bez výrazné série.</li> : null}
              </ul>
            </div>
          );
        })}
      </div>

      {ins.reached.length > 0 ? (
        <div>
          <h3 className="label mb-3 flex items-center gap-2 text-gold">
            <Award className="size-4" aria-hidden />
            Milníky v tomto zápase
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            {ins.reached.map((m) => {
              const label = MILESTONE[m.kind]?.(m.value) ?? m.kind;
              const unit = label.replace(/^\d+\.\s*/, "");
              return (
                <li key={`${m.player_id}-${m.kind}`} className="flex gap-3 border border-gold/50 bg-gold/5 p-2.5 sm:gap-4 sm:p-3">
                  <Portrait src={m.headshot} alt={m.name} width={60} side={sideOf(m.team_id)} className="sm:!w-[84px] sm:!h-[112px]" />
                  <div className="flex min-w-0 flex-col justify-center">
                    <span className="display text-4xl leading-none text-gold tabular sm:text-5xl">{m.value}.</span>
                    <span className="mt-1 text-sm text-muted">{unit}</span>
                    <Link href={`/hrac/${m.player_id}`} className="mt-2 truncate font-semibold hover:text-accent">
                      {m.name}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {ins.notes.length > 0 ? (
        <div>
          <h3 className="label mb-3 text-muted">{game.status === "final" ? "Jak šli hráči do zápasu" : "Na koho se dívat"}</h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {(["home", "away"] as const).map((side) => (
              <ul key={side} className="space-y-1.5 sm:space-y-2">
                {notesBy(side).map((n) => (
                  <li key={n.player_id} className="flex gap-2 border-b border-line pb-1.5 last:border-b-0 sm:gap-3 sm:pb-2">
                    <Portrait src={n.photo} alt={n.name} width={40} side={side} className="sm:!w-[52px] sm:!h-[69px]" />
                    <div className="min-w-0 self-center">
                      <Link href={`/hrac/${n.player_id}`} className="block truncate text-[13px] font-semibold hover:text-accent sm:text-base">
                        {n.name}
                      </Link>
                      {n.texts.map((t) => (
                        <span key={t} className="block text-[11px] leading-snug text-muted sm:text-xs">
                          {t}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
