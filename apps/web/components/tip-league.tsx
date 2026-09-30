"use client";

import { useQueries } from "@tanstack/react-query";
import { motion } from "motion/react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { pragueDate, tipPoints, type Game } from "@hokejhub/core";
import type { ScoreboardResponse } from "@/lib/types";
import { useTips, type TipEntry } from "@/lib/tips";
import { ClubLogo } from "./club-logo";
import { Card, Empty } from "./ui/card";

interface Row {
  e: TipEntry;
  game: Game | null;
  mine: number | null;
  model: number | null;
}

const pointsCls = (p: number | null) =>
  p === null ? "text-muted" : p === 5 ? "bg-gold text-black" : p >= 3 ? "bg-win/80 text-white" : p > 0 ? "bg-win/30" : "bg-surface-2 text-muted";

export function TipLeague() {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const tips = useTips();
  const entries = Object.values(tips).sort((a, b) => b.startAt.localeCompare(a.startAt));
  const today = pragueDate();
  const dates = [...new Set(entries.filter((e) => e.date <= today).map((e) => e.date))];
  const boards = useQueries({
    queries: dates.map((d) => ({
      queryKey: ["scoreboard", d],
      queryFn: async () => (await (await fetch(`/api/scoreboard?date=${d}`)).json()) as ScoreboardResponse,
      staleTime: d === today ? 60_000 : Infinity,
    })),
  });
  const games = new Map<string, Game>();
  for (const b of boards) for (const g of b.data?.games ?? []) games.set(g.id, g);

  const rows: Row[] = entries.map((e) => {
    const g = games.get(e.gameId) ?? null;
    const done = g?.status === "final" && g.homeScore !== null && g.awayScore !== null;
    return {
      e,
      game: g,
      mine: done ? tipPoints(e.tip, g!.homeScore!, g!.awayScore!, g!.decidedIn) : null,
      model: done ? tipPoints(e.model, g!.homeScore!, g!.awayScore!, g!.decidedIn) : null,
    };
  });
  const scored = rows.filter((r) => r.mine !== null);
  const me = scored.reduce((s, r) => s + r.mine!, 0);
  const bot = scored.reduce((s, r) => s + r.model!, 0);
  const exact = scored.filter((r) => r.mine === 5).length;
  const max = Math.max(1, me, bot);

  if (!mounted) return null;
  return (
    <div className="space-y-4">
      <header className="rise">
        <h1 className="text-3xl font-black tracking-tight">Tipovačka: ty vs. model</h1>
        <p className="mt-1 text-sm text-muted">
          Přesné skóre 5 b., správný vítěz i rozdíl 3 b., jen vítěz 2 b. Prodloužení a nájezdy se počítají jako remíza po 60 minutách. Tipy se ukládají v tomto
          prohlížeči.
        </p>
      </header>

      <Card>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {[
            { label: "Ty", v: me, cls: "bg-home" },
            null,
            { label: "Model", v: bot, cls: "bg-away" },
          ].map((x, i) =>
            x ? (
              <div key={i} className={i === 0 ? "text-left" : "text-right"}>
                <div className="label text-muted">{x.label}</div>
                <div className="text-5xl font-black tabular">{x.v}</div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                  <motion.div
                    className={`h-full rounded-full ${x.cls} ${i === 2 ? "ml-auto" : ""}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(x.v / max) * 100}%` }}
                    transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
                  />
                </div>
              </div>
            ) : (
              <div key={i} className="text-center text-sm text-muted">
                {scored.length ? (me > bot ? "Vedeš" : me < bot ? "Vede model" : "Nerozhodně") : "vs"}
                <div className="text-xs">{scored.length} vyhodnocených · {exact}× přesně</div>
              </div>
            ),
          )}
        </div>
      </Card>

      <Card title="Moje tipy">
        {rows.length === 0 ? (
          <Empty>
            Zatím žádné tipy. Tipuj na stránce{" "}
            <Link href="/predikce" className="text-accent">
              Predikce
            </Link>
            .
          </Empty>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map(({ e, game, mine, model }) => (
              <li key={e.gameId} className="grid grid-cols-[1fr_auto] items-center gap-2 py-2 text-sm sm:grid-cols-[88px_1fr_auto_auto_auto]">
                <span className="hidden text-xs text-muted tabular sm:block">
                  {new Date(e.startAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}
                </span>
                <Link href={`/zapas/${e.gameId}?d=${e.date}`} className="flex min-w-0 items-center gap-1.5 hover:text-accent">
                  <ClubLogo src={e.homeLogo} alt="" size={24} />
                  <span className="truncate">
                    {e.home} – {e.away}
                  </span>
                  <ClubLogo src={e.awayLogo} alt="" size={24} />
                </Link>
                <span className="text-right font-bold tabular">
                  {game && game.homeScore !== null ? `${game.homeScore}:${game.awayScore}${game.decidedIn === "OT" ? " pp" : game.decidedIn === "SO" ? " sn" : ""}` : "–"}
                </span>
                <span className={`rounded-md px-2 py-0.5 text-center text-xs tabular ${pointsCls(mine)}`} title="Tvůj tip">
                  {e.tip.home}:{e.tip.away}
                  {mine !== null ? ` · ${mine}` : ""}
                </span>
                <span className={`rounded-md px-2 py-0.5 text-center text-xs tabular ${pointsCls(model)}`} title="Tip modelu">
                  M {e.model.home}:{e.model.away}
                  {model !== null ? ` · ${model}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
