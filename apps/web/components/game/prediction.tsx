"use client";

import { motion } from "motion/react";
import { impliedProbs, type Game, type Odds1x2 } from "@hokejhub/core";
import type { GameDetailResponse } from "@/lib/types";

type Pred = NonNullable<GameDetailResponse["prediction"]>;

const pct = (v: number) => `${Math.round(v * 100)} %`;

/** Model vs. market for the 60-minute result, with value flags. */
export function PredictionCard({ game, prediction, odds }: { game: Game; prediction: Pred; odds: Odds1x2 | null }) {
  const market = odds ? impliedProbs(odds) : null;
  const rows = [
    { key: "home" as const, label: game.home.shortName, color: "bg-home" },
    { key: "draw" as const, label: "Remíza po 60 min", color: "bg-muted" },
    { key: "away" as const, label: game.away.shortName, color: "bg-away" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted tabular">
        <span>{prediction.homeElo != null ? `Elo ${prediction.homeElo} vs ${prediction.awayElo}` : "podle gólů v sezóně"}</span>
        <span>
          očekávané skóre{" "}
          <span className="font-semibold text-fg">
            {prediction.expHome.toFixed(1)} : {prediction.expAway.toFixed(1)}
          </span>
        </span>
      </div>
      {rows.map((r, i) => {
        const model = prediction[r.key];
        const mk = market?.[r.key];
        const edge = mk !== undefined ? model - mk : null;
        const value = edge !== null && edge > 0.04 && odds?.[r.key];
        return (
          <div key={r.key}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {r.label}
                {value ? (
                  <span className="rounded bg-win/20 px-1.5 text-[10px] font-bold uppercase text-win" title="Model dává vyšší pravděpodobnost než kurz">
                    value {odds?.[r.key]?.toFixed(2)}
                  </span>
                ) : null}
              </span>
              <span className="tabular">
                <span className="font-bold">{pct(model)}</span>
                {mk !== undefined ? <span className="ml-2 text-xs text-muted">trh {pct(mk)}</span> : null}
              </span>
            </div>
            <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
              <motion.div
                className={`h-full rounded-full ${r.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${model * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.08 }}
              />
              {mk !== undefined ? (
                <span className="absolute top-0 h-full w-0.5 bg-fg" style={{ left: `${mk * 100}%` }} title="Pravděpodobnost podle kurzu" />
              ) : null}
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-muted">
        {game.leagueKey === "nhl"
          ? "Náš model: průměr vstřelených a obdržených gólů obou týmů v sezóně → očekávané góly → Poissonovo rozdělení."
          : "Náš model: Elo z celé historie extraligy → očekávané góly → Poissonovo rozdělení."} Svislá čárka = pravděpodobnost z kurzu
        Tipsportu bez marže. Výhra včetně prodloužení: {game.home.shortName} {pct(prediction.homeWin)}.
      </p>
    </div>
  );
}
