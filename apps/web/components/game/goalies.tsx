"use client";

import { CS, csCount, type Game, type HokejczMatch, type ShotEvent } from "@hokejhub/core";
import { RefreshCcw } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Duel, VersusBar } from "./versus";

/** "Pavel ČAJAN" → "Pavel Čajan" (hokej.cz prints surnames in capitals). */
export const niceName = (n: string) =>
  n
    .split(" ")
    .map((w) => (w.length > 1 && w === w.toUpperCase() ? w.charAt(0) + w.slice(1).toLocaleLowerCase("cs") : w))
    .join(" ");

const secs = (s: ShotEvent) => (s.period - 1) * 1200 + s.periodSeconds;
const pct = (v: number | null) => (v === null ? "–" : `${(v * 100).toFixed(2).replace(".", ",")} %`);
const mmss = (t: number | null) => (t === null ? "" : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`);

interface GoalieView {
  id: string | null;
  name: string;
  number: number | null;
  toi: number | null;
  ga: number;
  saves: number;
  svPct: number | null;
  gsax: number | null;
}

/**
 * Goalies of one side with the unblocked shots they faced. Shots are assigned by time in net:
 * the starter from the opening faceoff for his TOI, the next goalie after that.
 */
function goaliesOf(box: HokejczMatch, side: "home" | "away", game: Game, shots: ShotEvent[] | null, photos: Record<string, string> | null) {
  const oppId = side === "home" ? game.away.id : game.home.id;
  let from = 0;
  return box.goalies[side]
    .filter((g) => (g.toiSeconds ?? 0) > 0)
    .map((g) => {
      const to = from + (g.toiSeconds ?? 0);
      const faced = shots?.filter((s) => s.teamId === oppId && s.type !== "blocked-shot" && secs(s) >= from && secs(s) < to) ?? null;
      from = to;
      const id = g.player.id ? `hcz-${g.player.id}` : null;
      const xgFaced = faced ? faced.reduce((a, s) => a + (s.xg ?? 0), 0) : null;
      return {
        view: {
          id,
          name: niceName(g.player.name),
          number: g.number,
          toi: g.toiSeconds,
          ga: g.goalsAgainst,
          saves: g.saves,
          svPct: g.savePct !== null ? g.savePct / 100 : g.saves + g.goalsAgainst ? g.saves / (g.saves + g.goalsAgainst) : null,
          gsax: xgFaced !== null && faced!.some((s) => s.xg !== undefined) ? xgFaced - g.goalsAgainst : null,
        } satisfies GoalieView,
        photo: id ? (photos?.[id] ?? null) : null,
      };
    });
}

/** Half-dial from −5 to +5 with a needle: goals saved above expected. */
function GsaxGauge({ value, side }: { value: number; side: "home" | "away" }) {
  const clamped = Math.max(-5, Math.min(5, value));
  // −5 points left, 0 straight up, +5 right; rounded so SSR and browser attributes match.
  const a = Math.PI * (0.5 - clamped / 10);
  const tip = [Math.round(Math.cos(a) * 4000) / 100, Math.round(-Math.sin(a) * 4000) / 100] as const;
  const color = side === "home" ? "var(--home)" : "var(--away)";
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="-60 -62 120 70" className="w-full max-w-44" aria-hidden>
        <path d="M -48 0 A 48 48 0 0 1 48 0" fill="none" stroke="var(--surface-2)" strokeWidth="10" />
        <line x1="0" y1="-54" x2="0" y2="-43" stroke={color} strokeWidth="3" />
        <text x="0" y="-57" textAnchor="middle" fontSize="7" fill="var(--muted)">
          0
        </text>
        <text x="-54" y="6" textAnchor="middle" fontSize="7" fill="var(--muted)">
          −5
        </text>
        <text x="54" y="6" textAnchor="middle" fontSize="7" fill="var(--muted)">
          +5
        </text>
        <motion.line
          x1="0"
          y1="0"
          initial={{ x2: -40, y2: 0 }}
          whileInView={{ x2: tip[0], y2: tip[1] }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 60, damping: 9 }}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="0" cy="0" r="4.5" fill="var(--surface)" stroke={color} strokeWidth="2.5" />
      </svg>
      <span className={`display text-3xl tabular ${side === "home" ? "text-home" : "text-away"}`}>
        {value > 0 ? "+" : ""}
        {value.toFixed(2).replace(".", ",")}
      </span>
    </div>
  );
}

/** Goalie against goalie: time in net, goals saved above expected, goals against, save %, saves. */
export function GoalieDuel({
  game,
  box,
  shots,
  photos,
}: {
  game: Game;
  box: HokejczMatch;
  shots: ShotEvent[] | null;
  photos: Record<string, string> | null;
}) {
  const home = goaliesOf(box, "home", game, shots, photos);
  const away = goaliesOf(box, "away", game, shots, photos);
  const combos = home.flatMap((h, i) => away.map((_, j) => [i, j] as const));
  const [k, setK] = useState(0);
  if (home.length === 0 || away.length === 0) return null;
  const [hi, ai] = combos[k % combos.length]!;
  const h = home[hi]!;
  const a = away[ai]!;
  return (
    <div>
      <div className="relative">
        {combos.length > 1 ? (
          <button
            type="button"
            onClick={() => setK(k + 1)}
            className="absolute left-0 top-2 z-10 grid size-11 place-items-center rounded-full bg-surface-2 hover:bg-line"
            aria-label="Přepnout brankáře"
            title="Přepnout brankáře"
          >
            <RefreshCcw className="size-5" aria-hidden />
          </button>
        ) : null}
        <Duel
          home={{ id: h.view.id, name: h.view.name, number: h.view.number, photo: h.photo, sub: mmss(h.view.toi), value: "" }}
          away={{ id: a.view.id, name: a.view.name, number: a.view.number, photo: a.photo, sub: mmss(a.view.toi), value: "" }}
        />
      </div>
      {h.view.gsax !== null && a.view.gsax !== null ? (
        <div className="border-b border-line py-4">
          <h3 className="label mb-2 text-center text-[11px] text-fg">Góly chycené nad očekávání</h3>
          <div key={k} className="grid grid-cols-2 gap-4">
            <GsaxGauge value={h.view.gsax} side="home" />
            <GsaxGauge value={a.view.gsax} side="away" />
          </div>
        </div>
      ) : null}
      <div key={`b${k}`} className="pt-2">
        <VersusBar label="Inkasované góly" home={h.view.ga} away={a.view.ga} lowerIsBetter />
        <VersusBar
          label="Úspěšnost zákroků"
          home={h.view.svPct ?? 0}
          away={a.view.svPct ?? 0}
          homeText={pct(h.view.svPct)}
          awayText={pct(a.view.svPct)}
          delay={0.05}
        />
        <VersusBar label="Počet zásahů" home={h.view.saves} away={a.view.saves} delay={0.1} />
      </div>
    </div>
  );
}

/** One standout per team: the skater with the best line, or the goalie when he stole the show. */
export function BestPlayers({ box, photos }: { box: HokejczMatch; photos: Record<string, string> | null }) {
  const pick = (side: "home" | "away") => {
    const skaters = box.skaters[side].map((s) => ({
      rating: s.goals * 1.0 + s.assists * 0.7 + s.shots * 0.08 + s.plusMinus * 0.15,
      id: s.player.id ? `hcz-${s.player.id}` : null,
      name: niceName(s.player.name),
      number: s.number,
      sub: s.position === "O" || s.position === "D" ? "obránce" : "útočník",
      value: `${s.goals}+${s.assists}`,
    }));
    const goalies = box.goalies[side]
      .filter((g) => (g.toiSeconds ?? 0) >= 2400 && g.saves + g.goalsAgainst > 0)
      .map((g) => {
        const sv = g.saves / (g.saves + g.goalsAgainst);
        return {
          rating: (sv - 0.9) * 40 + g.saves * 0.03 + (g.goalsAgainst === 0 ? 1.5 : 0),
          id: g.player.id ? `hcz-${g.player.id}` : null,
          name: niceName(g.player.name),
          number: g.number,
          sub: "brankář",
          value: pct(sv),
        };
      });
    const best = [...skaters, ...goalies].sort((x, y) => y.rating - x.rating)[0];
    return best ? { ...best, photo: best.id ? (photos?.[best.id] ?? null) : null } : null;
  };
  return <Duel home={pick("home")} away={pick("away")} />;
}

/** Crowd, fill rate, venue and officials. */
export function MatchInfo({ box }: { box: HokejczMatch }) {
  const fill = box.attendance && box.capacity ? Math.min(1, box.attendance / box.capacity) : null;
  const row = "border-b border-line py-4 text-center last:border-b-0";
  return (
    <div>
      {box.attendance ? (
        <div className={row}>
          <h3 className="label text-[11px] text-fg">Počet diváků</h3>
          <div className="display mt-1 text-4xl tabular">{box.attendance.toLocaleString("cs-CZ")}</div>
          {box.venue ? <div className="text-sm text-muted">{box.venue}</div> : null}
          {fill !== null ? (
            <>
              <div className="mx-auto mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-surface-2">
                <motion.div
                  className={`h-full rounded-full ${fill >= 0.98 ? "bg-live" : "bg-accent"}`}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${fill * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
                />
              </div>
              <p className="mt-2 text-sm">
                {fill >= 0.98 ? (
                  <b>Vyprodáno</b>
                ) : (
                  <>
                    Zaplněno <b>{Math.round(fill * 100)} %</b>
                  </>
                )}{" "}
                z kapacity <b>{csCount(box.capacity!, CS.divak)}</b>
              </p>
            </>
          ) : null}
        </div>
      ) : null}
      {box.referees.length ? (
        <div className={row}>
          <h3 className="label text-[11px] text-fg">Hlavní rozhodčí</h3>
          <p className="mt-1">{box.referees.join(", ")}</p>
        </div>
      ) : null}
      {box.linesmen.length ? (
        <div className={row}>
          <h3 className="label text-[11px] text-fg">Čároví rozhodčí</h3>
          <p className="mt-1">{box.linesmen.join(", ")}</p>
        </div>
      ) : null}
    </div>
  );
}
