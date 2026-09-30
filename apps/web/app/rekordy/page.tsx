/* eslint-disable @next/next/no-img-element -- remote club logo watermark */
import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import Link from "next/link";
import type { ReactNode } from "react";
import { DbGameLine } from "@/components/db-game-line";
import { Crown, Flame, Goal, Zap, Sparkles, TrendingUp, Trophy, Users, Timer, Repeat } from "lucide-react";
import { ClubLogo } from "@/components/club-logo";
import { Portrait } from "@/components/portrait";
import { Card, Empty } from "@/components/ui/card";
import { seasonLabel } from "@/lib/format";
import { dbAvailable } from "@/lib/server/db";
import { recordGames, recordPlayers } from "@/lib/server/hub";
import { CS, csCount, csPlural, type CsForms } from "@hokejhub/core";
import { imgSrc } from "@/lib/img";

export const metadata: Metadata = { title: "Rekordy extraligy" };
export const revalidate = 3600;

type PodiumRow = {
  key: string;
  id: string;
  name: string;
  photo: string | null;
  logo?: string | null;
  value: ReactNode;
  sub: ReactNode;
};

/** Record holder as a big card, the chasers as a compact list with photos and club logos. */
function Podium({ rows, unit }: { rows: PodiumRow[]; unit: CsForms }) {
  if (rows.length === 0) return <Empty>Zatím bez dat.</Empty>;
  const [top, ...rest] = rows;
  return (
    <div>
      <Link href={`/hrac/${top!.id}`} className="line-change group relative flex items-end gap-4 overflow-hidden bg-board p-3 text-board-text">
        {top!.logo ? (
          <img src={imgSrc(top!.logo)!} alt="" aria-hidden className="pointer-events-none absolute -right-6 -top-6 size-40 object-contain opacity-[0.08]" />
        ) : null}
        <Portrait src={top!.photo} alt={top!.name} width={96} />
        <div className="relative min-w-0 flex-1 pb-1">
          <span className="label flex items-center gap-1.5 text-gold">
            <Crown className="size-3.5" aria-hidden /> Rekord
          </span>
          <div className="display mt-1 truncate text-xl group-hover:text-led">{top!.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-board-muted">
            {top!.logo ? <ClubLogo src={top!.logo} alt="" size={18} /> : null}
            {top!.sub}
          </div>
        </div>
        <div className="relative pb-1 text-right">
          <div className="display text-5xl leading-none tabular text-led">{top!.value}</div>
          <div className="label mt-1 text-board-muted">{typeof top!.value === "number" ? csPlural(top!.value, unit) : unit[2]}</div>
        </div>
      </Link>
      <ol className="mt-2 divide-y divide-line">
        {rest.map((r, i) => (
          <li key={r.key} className="flex items-center gap-3 py-1.5">
            <span className="w-5 text-right text-sm font-bold tabular text-muted">{i + 2}.</span>
            <Portrait src={r.photo} alt={r.name} width={36} />
            <div className="min-w-0 flex-1">
              <Link href={`/hrac/${r.id}`} className="block truncate font-semibold hover:text-accent">
                {r.name}
              </Link>
              <span className="flex items-center gap-1.5 truncate text-xs text-muted">
                {r.logo ? <ClubLogo src={r.logo} alt="" size={16} /> : null}
                {r.sub}
              </span>
            </div>
            <span className="display text-xl tabular">{r.value}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const year = (iso: string) => new Date(iso).getFullYear();

export default async function RecordsPage() {
  if (!dbAvailable()) return <Empty>Databáze není připojena.</Empty>;
  const [g, p] = await Promise.all([recordGames("cz-elh"), recordPlayers("cz-elh")]);
  return (
    <div className="space-y-4">
      <PageHero kicker="Tipsport extraliga · od 1993/94" title="Rekordy" icon={Crown}>
        <p>
          Počítáno z kompletní databáze zápasů – doplňuje se, jak crawler prochází historii hokej.cz. Starší éra:{" "}
          <Link href="/historie" className="text-accent">
            československá liga 1936–1993
          </Link>
          .
        </p>
      </PageHero>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Nejvíc bodů v kariéře (ELH)" icon={Trophy}>
          <Podium
            unit={CS.bod}
            rows={p.careerPoints.map((r) => ({
              key: r.player_id,
              id: r.player_id,
              name: r.name,
              photo: r.headshot,
              value: r.value,
              sub: `${r.gp} záp. · ${csCount(r.goals, CS.gol)}`,
            }))}
          />
        </Card>
        <Card title="Nejvíc odehraných zápasů" icon={Timer}>
          <Podium
            unit={CS.zapas}
            rows={p.careerGames.map((r) => ({
              key: r.player_id,
              id: r.player_id,
              name: r.name,
              photo: r.headshot,
              value: r.value,
              sub: csCount(r.seasons, CS.sezona),
            }))}
          />
        </Card>
        <Card title="Nejvíc bodů v základní části" icon={TrendingUp}>
          <Podium
            unit={CS.bod}
            rows={p.seasonPoints.map((r) => ({
              key: `${r.player_id}-${r.season}`,
              id: r.player_id,
              name: r.name,
              photo: r.headshot,
              logo: r.team_logo,
              value: r.value,
              sub: `${seasonLabel(r.season)} · ${r.team_abbrev} · ${r.gp} záp.`,
            }))}
          />
        </Card>
        <Card title="Nejvíc gólů v základní části" icon={Goal}>
          <Podium
            unit={CS.gol}
            rows={p.seasonGoals.map((r) => ({
              key: `${r.player_id}-${r.season}`,
              id: r.player_id,
              name: r.name,
              photo: r.headshot,
              logo: r.team_logo,
              value: r.value,
              sub: `${seasonLabel(r.season)} · ${r.team_abbrev} · ${r.gp} záp.`,
            }))}
          />
        </Card>
        <Card title="Nejvíc gólů v jednom zápase" icon={Flame}>
          <Podium
            unit={CS.gol}
            rows={p.gameGoals.map((r) => ({
              key: r.game_id + r.player_id,
              id: r.player_id,
              name: r.name,
              photo: r.headshot,
              logo: r.team_logo,
              value: r.value,
              sub: `vs. ${r.opp_name} · ${year(r.start_at)}`,
            }))}
          />
        </Card>
        <Card title="Nejvíc bodů v jednom zápase" icon={Sparkles}>
          <Podium
            unit={CS.bod}
            rows={p.gamePoints.map((r) => ({
              key: r.game_id + r.player_id,
              id: r.player_id,
              name: r.name,
              photo: r.headshot,
              logo: r.team_logo,
              value: r.value,
              sub: `vs. ${r.opp_name} · ${year(r.start_at)}`,
            }))}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Nejvyšší výhry" icon={Zap}>
          {g.biggestWins.map((x) => (
            <DbGameLine key={x.id} g={x} note={`o ${Math.abs((x.home_score ?? 0) - (x.away_score ?? 0))}`} />
          ))}
        </Card>
        <Card title="Nejvíc gólů v zápase" icon={Goal}>
          {g.highestScoring.map((x) => (
            <DbGameLine key={x.id} g={x} note={csCount((x.home_score ?? 0) + (x.away_score ?? 0) - (x.decided_in === "SO" ? 1 : 0), CS.gol)} />
          ))}
        </Card>
        <Card title="Největší obraty (otočené ztráty 3+ gólů)" icon={Repeat}>
          {g.comebacks.length ? g.comebacks.map((x) => <DbGameLine key={x.id} g={x} note={`z −${x.deficit}`} />) : <Empty>Zatím žádný.</Empty>}
        </Card>
        <Card title="Rekordní návštěvy" icon={Users}>
          {g.attendance.map((x) => (
            <DbGameLine key={x.id} g={x} note={csCount(x.attendance ?? 0, CS.divak)} />
          ))}
        </Card>
      </div>
    </div>
  );
}
