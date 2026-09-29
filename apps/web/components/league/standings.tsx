"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { computeOverUnder, computeStandings, type FormResult, type ResultGame, type Split } from "@hokejhub/core";
import { Segmented } from "../game/segmented";

const FORM_STYLE: Record<FormResult, string> = {
  W: "bg-win text-white",
  OTW: "bg-win/60 text-white",
  OTL: "bg-gold/70 text-black",
  L: "bg-live text-white",
};
const FORM_LABEL: Record<FormResult, string> = { W: "V", OTW: "VP", OTL: "PP", L: "P" };

export function FormBadges({ form }: { form: FormResult[] }) {
  return (
    <span className="flex gap-0.5">
      {form.map((f, i) => (
        <span key={i} title={FORM_LABEL[f]} className={`grid h-5 min-w-5 place-items-center rounded px-0.5 text-[9px] font-bold ${FORM_STYLE[f]}`}>
          {FORM_LABEL[f]}
        </span>
      ))}
    </span>
  );
}

type Mode = "table" | "ou";

export function Standings({ games, highlight = [] }: { games: ResultGame[]; highlight?: string[] }) {
  const [mode, setMode] = useState<Mode>("table");
  const [split, setSplit] = useState<Split>("overall");
  const [lastN, setLastN] = useState<"all" | "5" | "10" | "15">("all");
  const [line, setLine] = useState<"4.5" | "5.5" | "6.5">("5.5");

  const rows = useMemo(
    () => computeStandings(games, { split, lastN: lastN === "all" ? undefined : Number(lastN) }),
    [games, split, lastN],
  );
  const ou = useMemo(() => computeOverUnder(games, Number(line)), [games, line]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Segmented value={mode} onChange={setMode} options={[{ value: "table", label: "Tabulka" }, { value: "ou", label: "Over/Under" }]} />
        {mode === "table" ? (
          <>
            <Segmented
              value={split}
              onChange={setSplit}
              options={[
                { value: "overall", label: "Celkem" },
                { value: "home", label: "Doma" },
                { value: "away", label: "Venku" },
              ]}
            />
            <Segmented
              value={lastN}
              onChange={setLastN}
              options={[
                { value: "all", label: "Sezóna" },
                { value: "5", label: "Forma 5" },
                { value: "10", label: "Forma 10" },
                { value: "15", label: "Forma 15" },
              ]}
            />
          </>
        ) : (
          <Segmented
            value={line}
            onChange={setLine}
            options={[
              { value: "4.5", label: "4,5" },
              { value: "5.5", label: "5,5" },
              { value: "6.5", label: "6,5" },
            ]}
          />
        )}
      </div>
      <div className="-mx-4 overflow-x-auto px-4">
        {mode === "table" ? (
          <table className="w-full min-w-[560px] text-sm tabular">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-2 pr-2 text-left font-medium">#</th>
                <th className="py-2 pr-2 text-left font-medium">Tým</th>
                <th className="px-1.5 text-right font-medium" title="Zápasy">Z</th>
                <th className="px-1.5 text-right font-medium" title="Výhry">V</th>
                <th className="px-1.5 text-right font-medium" title="Výhry po prodl./nájezdech">VP</th>
                <th className="px-1.5 text-right font-medium" title="Prohry po prodl./nájezdech">PP</th>
                <th className="px-1.5 text-right font-medium" title="Prohry">P</th>
                <th className="px-1.5 text-right font-medium">Skóre</th>
                <th className="px-1.5 text-right font-medium">+/−</th>
                <th className="px-1.5 text-right font-bold">B</th>
                <th className="pl-3 text-left font-medium">Forma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.teamId} className={`transition-colors hover:bg-surface-2 ${highlight.includes(r.teamId) ? "bg-accent-soft" : ""}`}>
                  <td className="py-2 pr-2">
                    <span
                      className={`grid size-6 place-items-center rounded-md text-xs font-bold ${
                        r.rank <= 6 ? "bg-accent/20 text-accent" : r.rank <= 10 ? "bg-surface-2" : "text-muted"
                      }`}
                    >
                      {r.rank}
                    </span>
                  </td>
                  <td className="py-2 pr-2 font-medium">
                    <Link href={`/tym/${r.teamId}`} className="hover:text-accent">
                      {r.teamName}
                    </Link>
                  </td>
                  <td className="px-1.5 text-right">{r.gp}</td>
                  <td className="px-1.5 text-right">{r.w}</td>
                  <td className="px-1.5 text-right">{r.otw}</td>
                  <td className="px-1.5 text-right">{r.otl}</td>
                  <td className="px-1.5 text-right">{r.l}</td>
                  <td className="px-1.5 text-right">
                    {r.gf}:{r.ga}
                  </td>
                  <td className={`px-1.5 text-right ${r.gf - r.ga > 0 ? "text-win" : r.gf - r.ga < 0 ? "text-live" : ""}`}>
                    {r.gf - r.ga > 0 ? "+" : ""}
                    {r.gf - r.ga}
                  </td>
                  <td className="px-1.5 text-right font-bold">{r.pts}</td>
                  <td className="pl-3">
                    <FormBadges form={r.form} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[420px] text-sm tabular">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-2 text-left font-medium">Tým</th>
                <th className="px-2 text-right font-medium">Z</th>
                <th className="px-2 text-right font-medium">Over {line.replace(".", ",")}</th>
                <th className="px-2 text-right font-medium">Under {line.replace(".", ",")}</th>
                <th className="px-2 text-right font-medium">Over %</th>
                <th className="px-2 text-right font-medium">Ø gólů</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ou.map((r) => (
                <tr key={r.teamId} className="hover:bg-surface-2">
                  <td className="py-2 font-medium">
                    <Link href={`/tym/${r.teamId}`} className="hover:text-accent">
                      {r.teamName}
                    </Link>
                  </td>
                  <td className="px-2 text-right">{r.gp}</td>
                  <td className="px-2 text-right">{r.over}</td>
                  <td className="px-2 text-right">{r.under}</td>
                  <td className="px-2 text-right font-semibold">{Math.round((r.over / (r.gp || 1)) * 100)} %</td>
                  <td className="px-2 text-right">{r.avgTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-2 text-[11px] text-muted">V = výhra, VP = výhra po prodloužení/nájezdech, PP = prohra po prodloužení/nájezdech, P = prohra. Body 3-2-1-0.</p>
    </div>
  );
}
