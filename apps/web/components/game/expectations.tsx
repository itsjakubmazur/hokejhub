"use client";

import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { ScoreGrid } from "./score-grid";

function poisson(k: number, l: number) {
  let p = Math.exp(-l);
  for (let i = 1; i <= k; i++) p *= l / i;
  return p;
}

const pct = (v: number) => `${Math.round(v * 100)} %`;

/**
 * What the model expects from the game in questions people actually ask — total goals, both
 * teams scoring, margins, a shutout — derived from the same score distribution as the 1X2.
 * The exact-score matrix stays available behind a toggle.
 */
export function Expectations({ expHome, expAway, homeLabel, awayLabel }: { expHome: number; expAway: number; homeLabel: string; awayLabel: string }) {
  const [matrix, setMatrix] = useState(false);
  const f = useMemo(() => {
    const N = 12;
    let sum = 0;
    const cells: { h: number; a: number; p: number }[] = [];
    for (let h = 0; h <= N; h++)
      for (let a = 0; a <= N; a++) {
        const p = poisson(h, expHome) * poisson(a, expAway) * (h === a ? 1.35 : 1);
        cells.push({ h, a, p });
        sum += p;
      }
    const P = (pred: (c: { h: number; a: number }) => boolean) => cells.filter(pred).reduce((s, c) => s + c.p, 0) / sum;
    const top = [...cells]
      .sort((x, y) => y.p - x.p)
      .slice(0, 3)
      .map((c) => ({ ...c, p: c.p / sum }));
    return {
      over45: P((c) => c.h + c.a >= 5),
      over55: P((c) => c.h + c.a >= 6),
      over65: P((c) => c.h + c.a >= 7),
      btts: P((c) => c.h > 0 && c.a > 0),
      homeBy2: P((c) => c.h - c.a >= 2),
      awayBy2: P((c) => c.a - c.h >= 2),
      oneGoal: P((c) => Math.abs(c.h - c.a) === 1),
      homeShutout: P((c) => c.a === 0),
      awayShutout: P((c) => c.h === 0),
      top,
      total: expHome + expAway,
    };
  }, [expHome, expAway]);

  const rows: { label: string; p: number; hint?: string }[] = [
    { label: "Padne 6 a víc gólů", p: f.over55, hint: `průměr ${f.total.toFixed(1)} · 5+ gólů ${pct(f.over45)} · 7+ gólů ${pct(f.over65)}` },
    { label: "Oba týmy dají gól", p: f.btts },
    { label: `${homeLabel} vyhraje o 2 a víc`, p: f.homeBy2 },
    { label: `${awayLabel} vyhraje o 2 a víc`, p: f.awayBy2 },
    { label: "Rozhodne jeden gól", p: f.oneGoal, hint: "po 60 minutách" },
    { label: `${homeLabel} udrží nulu`, p: f.homeShutout },
    { label: `${awayLabel} udrží nulu`, p: f.awayShutout },
  ];

  return (
    <div>
      <ul className="divide-y divide-line">
        {rows.map((r, i) => (
          <li key={r.label} className="flex items-center gap-3 py-1.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">{r.label}</span>
                <span className="display text-lg tabular">{pct(r.p)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <motion.div
                  className={`h-full rounded-full ${r.p >= 0.5 ? "bg-accent" : "bg-muted/60"}`}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${r.p * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.04 }}
                />
              </div>
              {r.hint ? <div className="mt-0.5 text-[11px] text-muted">{r.hint}</div> : null}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-muted">Nejčastější výsledky:</span>
        {f.top.map((t, i) => (
          <span key={i} className={`border px-2 py-0.5 tabular ${i === 0 ? "border-fg font-semibold" : "border-line"}`}>
            {t.h}:{t.a} <span className="text-muted">{pct(t.p)}</span>
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        Přesných výsledků je přes třicet možných, proto ani ten nejčastější nemá víc než pár procent. Užitečnější jsou otázky nahoře.
      </p>
      <button
        type="button"
        onClick={() => setMatrix((v) => !v)}
        className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg"
        aria-expanded={matrix}
      >
        <ChevronDown className={`size-3.5 transition-transform ${matrix ? "rotate-180" : ""}`} aria-hidden />
        {matrix ? "Skrýt matici výsledků" : "Zobrazit matici výsledků"}
      </button>
      {matrix ? (
        <div className="mt-2">
          <ScoreGrid expHome={expHome} expAway={expAway} homeLabel={homeLabel} awayLabel={awayLabel} />
        </div>
      ) : null}
    </div>
  );
}
