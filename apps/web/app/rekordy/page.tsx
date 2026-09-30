import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { DbGameLine } from "@/components/db-game-line";
import { PlayerPhoto } from "@/components/player-photo";
import { Card, Empty } from "@/components/ui/card";
import { seasonLabel } from "@/lib/format";
import { dbAvailable } from "@/lib/server/db";
import { recordGames, recordPlayers } from "@/lib/server/hub";

export const metadata: Metadata = { title: "Rekordy extraligy" };
export const revalidate = 3600;

function Podium({
  rows,
}: {
  rows: { key: string; id: string; name: string; photo: string | null; value: ReactNode; sub: ReactNode }[];
}) {
  if (rows.length === 0) return <Empty>Zatím bez dat.</Empty>;
  return (
    <ol className="space-y-1.5">
      {rows.map((r, i) => (
        <li key={r.key} className={`rise flex items-center gap-2.5 rounded-xl px-2 py-1.5 ${i === 0 ? "bg-gold/10" : ""}`} style={{ animationDelay: `${i * 15}ms` }}>
          <span className={`w-5 text-right text-sm font-bold tabular ${i === 0 ? "text-gold" : "text-muted"}`}>{i + 1}.</span>
          <PlayerPhoto src={r.photo} alt={r.name} size={i === 0 ? 40 : 32} />
          <div className="min-w-0 flex-1">
            <Link href={`/hrac/${r.id}`} className="block truncate font-medium hover:text-accent">
              {r.name}
            </Link>
            <span className="block truncate text-xs text-muted">{r.sub}</span>
          </div>
          <span className={`font-black tabular ${i === 0 ? "text-2xl" : "text-lg"}`}>{r.value}</span>
        </li>
      ))}
    </ol>
  );
}

const year = (iso: string) => new Date(iso).getFullYear();

export default async function RecordsPage() {
  if (!dbAvailable()) return <Empty>Databáze není připojena.</Empty>;
  const [g, p] = await Promise.all([recordGames("cz-elh"), recordPlayers("cz-elh")]);
  return (
    <div className="space-y-4">
      <header className="rise">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Tipsport extraliga · od 1993/94</p>
        <h1 className="text-3xl font-black tracking-tight">Rekordy</h1>
        <p className="mt-1 text-sm text-muted">
          Počítáno z kompletní databáze zápasů – doplňuje se, jak crawler prochází historii hokej.cz. Starší éra:{" "}
          <Link href="/historie" className="text-accent">
            československá liga 1936–1993
          </Link>
          .
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Nejvíc bodů v kariéře (ELH)">
          <Podium rows={p.careerPoints.map((r) => ({ key: r.player_id, id: r.player_id, name: r.name, photo: r.headshot, value: r.value, sub: `${r.gp} záp. · ${r.goals} gólů` }))} />
        </Card>
        <Card title="Nejvíc odehraných zápasů">
          <Podium rows={p.careerGames.map((r) => ({ key: r.player_id, id: r.player_id, name: r.name, photo: r.headshot, value: r.value, sub: `${r.seasons} sezón` }))} />
        </Card>
        <Card title="Nejvíc bodů v základní části">
          <Podium
            rows={p.seasonPoints.map((r) => ({ key: `${r.player_id}-${r.season}`, id: r.player_id, name: r.name, photo: r.headshot, value: r.value, sub: `${seasonLabel(r.season)} · ${r.team_abbrev} · ${r.gp} záp.` }))}
          />
        </Card>
        <Card title="Nejvíc gólů v základní části">
          <Podium
            rows={p.seasonGoals.map((r) => ({ key: `${r.player_id}-${r.season}`, id: r.player_id, name: r.name, photo: r.headshot, value: r.value, sub: `${seasonLabel(r.season)} · ${r.team_abbrev} · ${r.gp} záp.` }))}
          />
        </Card>
        <Card title="Nejvíc gólů v jednom zápase">
          <Podium rows={p.gameGoals.map((r) => ({ key: r.game_id + r.player_id, id: r.player_id, name: r.name, photo: r.headshot, value: r.value, sub: `vs. ${r.opp_name} · ${year(r.start_at)}` }))} />
        </Card>
        <Card title="Nejvíc bodů v jednom zápase">
          <Podium rows={p.gamePoints.map((r) => ({ key: r.game_id + r.player_id, id: r.player_id, name: r.name, photo: r.headshot, value: r.value, sub: `vs. ${r.opp_name} · ${year(r.start_at)}` }))} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Nejvyšší výhry">
          {g.biggestWins.map((x) => (
            <DbGameLine key={x.id} g={x} note={`o ${Math.abs((x.home_score ?? 0) - (x.away_score ?? 0))}`} />
          ))}
        </Card>
        <Card title="Nejvíc gólů v zápase">
          {g.highestScoring.map((x) => (
            <DbGameLine key={x.id} g={x} note={`${(x.home_score ?? 0) + (x.away_score ?? 0) - (x.decided_in === "SO" ? 1 : 0)} gólů`} />
          ))}
        </Card>
        <Card title="Největší obraty (otočené ztráty 3+ gólů)">
          {g.comebacks.length ? g.comebacks.map((x) => <DbGameLine key={x.id} g={x} note={`z −${x.deficit}`} />) : <Empty>Zatím žádný.</Empty>}
        </Card>
        <Card title="Rekordní návštěvy">
          {g.attendance.map((x) => (
            <DbGameLine key={x.id} g={x} note={`${x.attendance?.toLocaleString("cs-CZ")} diváků`} />
          ))}
        </Card>
      </div>
    </div>
  );
}
