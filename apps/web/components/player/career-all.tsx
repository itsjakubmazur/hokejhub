import { Globe2 } from "lucide-react";
import type { CareerGroup, CareerLine } from "@hokejhub/core";
import { Card, Stat } from "@/components/ui/card";
import { getCareerAll } from "@/lib/server/career-all";

const GROUPS: { id: CareerGroup; title: string }[] = [
  { id: "senior", title: "Klubové soutěže dospělých" },
  { id: "national", title: "Reprezentace" },
  { id: "youth", title: "Mládež" },
  { id: "national-youth", title: "Mládežnické reprezentace" },
];

function total(lines: CareerLine[]) {
  return lines.reduce(
    (t, l) => ({ gp: t.gp + l.gp, g: t.g + (l.g ?? 0), a: t.a + (l.a ?? 0), pts: t.pts + (l.pts ?? 0) }),
    { gp: 0, g: 0, a: 0, pts: 0 },
  );
}

/** Career in every competition: extraliga from our games, the rest from hokej.cz and the NHL. */
export async function CareerAll({ playerId }: { playerId: string }) {
  const { lines, nhlId, hokejcz } = await getCareerAll(playerId);
  if (lines.length <= 1 && !hokejcz) return null;
  const senior = total(lines.filter((l) => l.group === "senior"));
  const national = total(lines.filter((l) => l.group === "national"));
  const youth = total(lines.filter((l) => l.group === "youth" || l.group === "national-youth"));
  const line = (t: { gp: number; g: number; a: number; pts: number }) => `${t.gp} Z · ${t.g} G · ${t.a} A`;

  return (
    <Card title="Kariéra ve všech soutěžích" icon={Globe2}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Body v klubech" value={senior.pts} sub={line(senior)} />
        {national.gp ? <Stat label="Body v reprezentaci" value={national.pts} sub={line(national)} /> : null}
        {youth.gp ? <Stat label="Body v mládeži" value={youth.pts} sub={line(youth)} /> : null}
      </div>
      <div className="-mx-3 mt-5 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[440px] text-sm tabular">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th className="py-2 text-left">Soutěž</th>
              <th className="text-right">Z</th>
              <th className="text-right">G</th>
              <th className="text-right">A</th>
              <th className="text-right font-bold">B</th>
            </tr>
          </thead>
          {GROUPS.map((grp) => {
            const rows = lines.filter((l) => l.group === grp.id);
            if (!rows.length) return null;
            const t = total(rows);
            return (
              <tbody key={grp.id} className="divide-y divide-line">
                <tr>
                  <td colSpan={5} className="label pb-1 pt-4 text-muted">
                    {grp.title}
                  </td>
                </tr>
                {rows.map((l) => (
                  <tr key={`${l.label}-${l.source}`} className="hover:bg-surface-2">
                    <td className="py-1.5">
                      {l.label}
                      {l.detail ? <span className="ml-1.5 text-xs text-muted">{l.detail}</span> : null}
                    </td>
                    <td className="text-right">{l.gp}</td>
                    <td className="text-right">{l.g ?? "–"}</td>
                    <td className="text-right">{l.a ?? "–"}</td>
                    <td className="text-right font-bold">{l.pts ?? "–"}</td>
                  </tr>
                ))}
                {rows.length > 1 ? (
                  <tr className="text-muted">
                    <td className="py-1.5 text-xs font-semibold uppercase tracking-wide">Celkem</td>
                    <td className="text-right">{t.gp}</td>
                    <td className="text-right">{t.g}</td>
                    <td className="text-right">{t.a}</td>
                    <td className="text-right font-bold">{t.pts}</td>
                  </tr>
                ) : null}
              </tbody>
            );
          })}
        </table>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Extraliga z odehraných zápasů v naší databázi, ostatní české soutěže a reprezentace podle hokej.cz
        {nhlId ? ", zahraniční soutěže podle NHL" : ""}. Základní část i play-off dohromady, bez přípravných turnajů.
        {!hokejcz ? " Data z hokej.cz se teď nepodařilo načíst." : ""}
      </p>
    </Card>
  );
}
