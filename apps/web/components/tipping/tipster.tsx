"use client";

import { useQuery } from "@tanstack/react-query";
import { Award, Bot, CalendarDays, Crown, Flame, Lock, Sparkles, Target, Trophy, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ClubLogo } from "../club-logo";
import { Segmented } from "../game/segmented";
import { Empty } from "../ui/card";
import { CS, csCount } from "@hokejhub/core";
import { api, LEAGUE_TAG, pointsCls } from "./api";

interface TipRow {
  game_id: string;
  league_key: string;
  play_date: string;
  start_at: string;
  home_name: string;
  away_name: string;
  home_logo: string | null;
  away_logo: string | null;
  home: number;
  away: number;
  home_score: number | null;
  away_score: number | null;
  decided_in: string | null;
  points: number | null;
  model_home: number | null;
  model_away: number | null;
  model_points: number | null;
  joker: boolean;
  started: boolean;
}

interface Profile {
  user: { id: string; nickname: string; club_logo: string | null; club_name: string | null; since: string };
  rank: number | null;
  players: number;
  points: number;
  bonus: number;
  stats: {
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
  };
  tips: TipRow[];
  bonusAnswers: { title: string; value: string; answer: string | null; points: number; correct: boolean | null }[];
}

const day = (iso: string) => new Date(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
const suffix = (d: string | null) => (d === "OT" ? " p" : d === "SO" ? " sn" : "");

function Tile({ icon: Icon, label, value, sub }: { icon: typeof Trophy; label: string; value: string | number; sub?: string }) {
  return (
    <div className="border border-line p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
        <Icon className="size-3.5" aria-hidden /> {label}
      </div>
      <div className="display mt-1 text-2xl tabular">{value}</div>
      {sub ? <div className="text-[11px] text-muted">{sub}</div> : null}
    </div>
  );
}

function TipLine({ t }: { t: TipRow }) {
  const settled = t.home_score !== null && t.away_score !== null;
  const started = t.started;
  return (
    <li className="grid grid-cols-[3.2rem_1fr_auto] items-center gap-2 py-2 text-sm">
      <div className="text-[11px] leading-tight text-muted tabular">
        {day(t.start_at)}
        <div className="font-semibold">{LEAGUE_TAG[t.league_key] ?? t.league_key}</div>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <ClubLogo src={t.home_logo} alt="" size={18} />
          <span className="truncate">{t.home_name}</span>
          <span className="text-muted">–</span>
          <span className="truncate">{t.away_name}</span>
          <ClubLogo src={t.away_logo} alt="" size={18} />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted tabular">
          <span>
            tip <b className="text-fg">{t.home}:{t.away}</b>
          </span>
          {settled ? (
            <span>
              výsledek {t.home_score}:{t.away_score}
              {suffix(t.decided_in)}
            </span>
          ) : (
            <span>{started ? "čeká na výsledek" : "zápas teprve bude"}</span>
          )}
          {t.model_home !== null ? (
            <span className="flex items-center gap-0.5">
              <Bot className="size-3" aria-hidden /> {t.model_home}:{t.model_away}
            </span>
          ) : null}
          {t.joker ? (
            <span className="flex items-center gap-0.5 font-bold text-gold">
              <Sparkles className="size-3" aria-hidden /> žolík
            </span>
          ) : null}
        </div>
      </div>
      <span className={`min-w-9 px-1.5 py-0.5 text-center text-xs font-bold tabular ${pointsCls(settled ? t.points : null, t.joker)}`}>
        {settled ? `+${t.points ?? 0}` : "–"}
      </span>
    </li>
  );
}

/** Slide-up sheet with a tipster's standing, form, badges, season picks and locked tips. */
export function TipsterSheet({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const [filter, setFilter] = useState<"all" | "points" | "exact" | "miss">("all");
  const { data, isLoading, error } = useQuery({
    queryKey: ["tip", "tipster", userId],
    queryFn: () => api<Profile>(`tipster?id=${userId}`),
    enabled: Boolean(userId),
  });
  useEffect(() => {
    if (!userId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [userId, onClose]);

  const settled = (data?.tips ?? []).filter((t) => t.home_score !== null);
  const pending = (data?.tips ?? []).filter((t) => t.home_score === null);
  const shown = settled.filter((t) =>
    filter === "points" ? (t.points ?? 0) > 0 : filter === "exact" ? (t.joker ? (t.points ?? 0) / 2 : t.points) === 5 : filter === "miss" ? !t.points : true,
  );
  const s = data?.stats;

  return (
    <AnimatePresence>
      {userId ? (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Zavřít" className="absolute inset-0 bg-black/55" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={data ? `Tipér ${data.user.nickname}` : "Tipér"}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="relative flex max-h-[88dvh] w-full max-w-2xl flex-col border-t border-line bg-surface sm:border"
          >
            <div className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-line sm:hidden" aria-hidden />
            <button type="button" onClick={onClose} aria-label="Zavřít" className="absolute right-3 top-3 z-10 text-muted hover:text-fg">
              <X className="size-5" aria-hidden />
            </button>
            <div className="overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pt-5">
              {isLoading ? <Empty>Načítám…</Empty> : null}
              {error ? <Empty>{(error as Error).message}</Empty> : null}
              {data && s ? (
                <div className="space-y-5">
                  <header className="flex items-center gap-3 bg-board p-3 text-board-text sm:p-4">
                    <span className="grid size-14 shrink-0 place-items-center bg-white p-1">
                      {data.user.club_logo ? <ClubLogo src={data.user.club_logo} alt="" size={48} /> : <Trophy className="size-6 text-black/40" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="display truncate text-3xl leading-none">{data.user.nickname}</h2>
                      <p className="mt-1 text-xs text-board-muted">
                        {data.user.club_name ? `${data.user.club_name} · ` : ""}tipuje od {new Date(data.user.since).toLocaleDateString("cs-CZ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="display text-4xl leading-none text-led tabular">{data.points}</div>
                      <div className="mt-1 flex items-center justify-end gap-1 text-xs text-board-muted">
                        {data.rank === 1 ? <Crown className="size-3.5 text-gold" aria-hidden /> : null}
                        {data.rank ? `${data.rank}. z ${data.players}` : "bez bodů"}
                      </div>
                    </div>
                  </header>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Tile icon={Target} label="Tipů" value={s.tips} sub={s.accuracy !== null ? `úspěšnost ${Math.round(s.accuracy * 100)} %` : undefined} />
                    <Tile icon={Award} label="Přesně" value={s.exact} sub={s.tips ? `${Math.round((s.exact / s.tips) * 100)} % tipů` : undefined} />
                    <Tile icon={Flame} label="Série" value={s.streak} sub={`nejdelší ${s.bestStreak}`} />
                    <Tile
                      icon={Bot}
                      label="Proti modelu"
                      value={`${s.points - s.model >= 0 ? "+" : ""}${s.points - s.model}`}
                      sub={`${s.points} : ${s.model} b.`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    {s.bestDay ? (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden /> nejlepší den {day(s.bestDay.date)}: <b className="text-fg">{csCount(s.bestDay.points, CS.bod)}</b>
                      </span>
                    ) : null}
                    {s.dayWins ? (
                      <span className="flex items-center gap-1">
                        <Crown className="size-3.5 text-gold" aria-hidden /> tipér dne {s.dayWins}×
                      </span>
                    ) : null}
                    {data.bonus ? <span>bonus za sezónní tipy +{data.bonus}</span> : null}
                  </div>

                  {s.badges.some((b) => b.earned) ? (
                    <section>
                      <h3 className="label mb-2 text-fg">Odznaky</h3>
                      <ul className="flex flex-wrap gap-1.5">
                        {s.badges
                          .filter((b) => b.earned)
                          .map((b) => (
                            <li key={b.id} title={b.text} className="flex items-center gap-1 border border-gold/50 bg-gold/10 px-2 py-0.5 text-xs font-semibold">
                              <Award className="size-3.5 text-gold" aria-hidden /> {b.title}
                            </li>
                          ))}
                      </ul>
                    </section>
                  ) : null}

                  {data.bonusAnswers.length ? (
                    <section>
                      <h3 className="label mb-2 text-fg">Sezónní tipy</h3>
                      <ul className="divide-y divide-line text-sm">
                        {data.bonusAnswers.map((a) => (
                          <li key={a.title} className="flex items-center justify-between gap-3 py-1.5">
                            <span className="min-w-0 truncate text-muted">{a.title}</span>
                            <span className={`shrink-0 font-semibold ${a.correct === true ? "text-win" : a.correct === false ? "text-muted line-through" : ""}`}>
                              {a.value}
                              {a.correct === true ? ` +${a.points}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {pending.length ? (
                    <section>
                      <h3 className="label mb-1 text-fg">Rozehrané a čekající</h3>
                      <ul className="divide-y divide-line">
                        {pending.map((t) => (
                          <TipLine key={t.game_id} t={t} />
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  <section>
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="label text-fg">Vyhodnocené tipy</h3>
                      <Segmented
                        value={filter}
                        onChange={setFilter}
                        options={[
                          { value: "all", label: "Vše" },
                          { value: "points", label: "Bodované" },
                          { value: "exact", label: "Přesně" },
                          { value: "miss", label: "Mimo" },
                        ]}
                      />
                    </div>
                    {shown.length ? (
                      <ul className="divide-y divide-line">
                        {shown.map((t) => (
                          <TipLine key={t.game_id} t={t} />
                        ))}
                      </ul>
                    ) : (
                      <Empty>Žádné tipy v tomto výběru.</Empty>
                    )}
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-muted">
                      <Lock className="size-3" aria-hidden /> Tipy na zápasy, které ještě nezačaly, uvidí jen jejich autor.
                    </p>
                  </section>
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
