/* eslint-disable @next/next/no-img-element -- remote club logos */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { computeStandings } from "@hokejhub/core";
import { Leaders } from "@/components/league/leaders";
import { FormBadges } from "@/components/league/standings";
import { TeamResults } from "@/components/team/results";
import { BarChart } from "@/components/ui/bar-chart";
import { Card, Empty, Stat } from "@/components/ui/card";
import { FillBar } from "@/components/ui/fill-bar";
import { SeasonSelect } from "@/components/ui/season-select";
import { seasonLabel } from "@/lib/format";
import { UrlTabs } from "@/components/ui/url-tabs";
import { dbAvailable } from "@/lib/server/db";
import {
  getAllTeamGames,
  getAttendanceByOpponent,
  getTeam,
  getTeamAttendance,
  getTeamFinalRanks,
  getTeamGames,
  getTeamSeasons,
  getTeamSkaters,
  toResultGames,
  type GameRowDb,
} from "@/lib/server/queries";

export const revalidate = 300;

const TABS = [
  { id: "prehled", label: "Přehled" },
  { id: "vysledky", label: "Výsledky" },
  { id: "hraci", label: "Hráči" },
  { id: "navstevnost", label: "Návštěvnost" },
  { id: "historie", label: "Historie" },
];

export async function generateMetadata(props: PageProps<"/tym/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  if (!dbAvailable()) return { title: "Tým" };
  const t = await getTeam(id);
  return { title: t?.name ?? "Tým" };
}

export default async function TeamPage(props: PageProps<"/tym/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  if (!dbAvailable()) return <Empty>Databáze není připojena.</Empty>;
  const team = await getTeam(id);
  if (!team) notFound();
  const seasons = (await getTeamSeasons(id)).map((s) => s.season);
  const season = seasons.includes(Number(sp.sezona)) ? Number(sp.sezona) : (seasons[0] ?? new Date().getFullYear());
  const tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as string) : "prehled";
  const games = await getTeamGames(id, season);

  return (
    <div className="space-y-4">
      <header className="rise relative overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(60% 120% at 0% 0%, var(--accent-soft), transparent)" }}
        />
        <div className="relative flex items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-white p-2 shadow-md">
            {team.logo_url ? <img src={team.logo_url} alt="" className="size-full object-contain" /> : <span className="text-xl font-black text-black">{team.abbrev}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <Link href="/liga/cz-elh" className="text-xs font-semibold uppercase tracking-wider text-muted hover:text-fg">
              Tipsport extraliga
            </Link>
            <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">{team.name}</h1>
          </div>
          <SeasonSelect seasons={seasons} value={season} />
        </div>
      </header>
      <UrlTabs tabs={TABS} active={tab} layoutId="team-tab" />
      {tab === "prehled" ? <Overview teamId={id} games={games} season={season} /> : null}
      {tab === "vysledky" ? (
        <Card title={`Zápasy ${seasonLabel(season)}`}>
          {games.length ? <TeamResults teamId={id} games={games} /> : <Empty>Žádné zápasy.</Empty>}
        </Card>
      ) : null}
      {tab === "hraci" ? <Players teamId={id} season={season} /> : null}
      {tab === "navstevnost" ? <Attendance teamId={id} season={season} /> : null}
      {tab === "historie" ? <History teamId={id} /> : null}
    </div>
  );
}

function record(teamId: string, games: GameRowDb[]) {
  const [row] = computeStandings(toResultGames(games)).filter((r) => r.teamId === teamId);
  return row;
}

async function Overview({ teamId, games, season }: { teamId: string; games: GameRowDb[]; season: number }) {
  const regular = games.filter((g) => g.phase === "regular");
  const played = toResultGames(regular);
  if (played.length === 0) return <Empty>Tato sezóna zatím nemá odehrané zápasy.</Empty>;
  const table = computeStandings(played);
  const me = table.find((r) => r.teamId === teamId)!;
  const home = computeStandings(played, { split: "home" }).find((r) => r.teamId === teamId);
  const away = computeStandings(played, { split: "away" }).find((r) => r.teamId === teamId);
  const last10 = computeStandings(played, { lastN: 10 }).find((r) => r.teamId === teamId);
  const xg = regular.reduce(
    (a, g) => {
      if (g.xg_home == null) return a;
      const isHome = g.home_team_id === teamId;
      return { f: a.f + (isHome ? g.xg_home : g.xg_away!), a: a.a + (isHome ? g.xg_away! : g.xg_home), n: a.n + 1 };
    },
    { f: 0, a: 0, n: 0 },
  );
  const att = regular.filter((g) => g.home_team_id === teamId && g.attendance);
  const avgAtt = att.length ? Math.round(att.reduce((a, g) => a + g.attendance!, 0) / att.length) : null;
  const biggest = [...regular]
    .filter((g) => g.status === "final" && g.home_score !== null)
    .map((g) => ({ g, diff: g.home_team_id === teamId ? g.home_score! - g.away_score! : g.away_score! - g.home_score! }))
    .sort((a, b) => b.diff - a.diff)[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Body" value={me.pts} sub={`${me.gp} zápasů · ${(me.pts / me.gp).toFixed(2)} na zápas`} />
        <Stat label="Bilance V-VP-PP-P" value={`${me.w}-${me.otw}-${me.otl}-${me.l}`} sub={`skóre ${me.gf}:${me.ga}`} />
        <Stat
          label="xG pro : proti"
          value={xg.n ? `${xg.f.toFixed(1)} : ${xg.a.toFixed(1)}` : "–"}
          sub={xg.n ? `xG% ${Math.round((xg.f / (xg.f + xg.a)) * 100)} % · ${xg.n} zápasů` : "bez dat o střelách"}
        />
        <Stat label="Průměrná návštěva" value={avgAtt?.toLocaleString("cs-CZ") ?? "–"} sub={`${att.length} domácích zápasů`} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Forma (posledních 5)">
          <div className="flex items-center justify-between">
            <FormBadges form={me.form} />
            {last10 ? (
              <span className="text-sm text-muted tabular">
                posledních 10: <span className="font-semibold text-fg">{last10.pts} b.</span>
              </span>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm tabular">
            {[
              ["Doma", home],
              ["Venku", away],
            ].map(([label, r]) =>
              r && typeof r === "object" ? (
                <div key={label as string} className="rounded-xl bg-surface-2 p-3">
                  <div className="text-xs text-muted">{label as string}</div>
                  <div className="font-bold">
                    {r.pts} b. · {r.w}-{r.otw}-{r.otl}-{r.l}
                  </div>
                  <div className="text-xs text-muted">
                    skóre {r.gf}:{r.ga}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </Card>
        <Card title={`Pořadí ${seasonLabel(season)}`}>
          <ol className="space-y-1 text-sm tabular">
            {table.slice(Math.max(0, me.rank - 3), me.rank + 2).map((r) => (
              <li
                key={r.teamId}
                className={`flex items-center justify-between rounded-lg px-2 py-1 ${r.teamId === teamId ? "bg-accent-soft font-bold" : ""}`}
              >
                <Link href={`/tym/${r.teamId}?sezona=${season}`} className="hover:text-accent">
                  {r.rank}. {r.teamName}
                </Link>
                <span>{r.pts} b.</span>
              </li>
            ))}
          </ol>
          {biggest && biggest.diff > 0 ? (
            <p className="mt-3 text-xs text-muted">
              Nejvyšší výhra: <span className="font-semibold text-fg">{biggest.g.home_score}:{biggest.g.away_score}</span> ({biggest.g.home_name} – {biggest.g.away_name})
            </p>
          ) : null}
        </Card>
      </div>
      <Card title="Poslední zápasy">
        <TeamResults teamId={teamId} games={games.filter((g) => g.status === "final").slice(-8)} />
      </Card>
    </div>
  );
}

async function Players({ teamId, season }: { teamId: string; season: number }) {
  const rows = await getTeamSkaters(teamId, season);
  if (rows.length === 0) return <Empty>Statistiky hráčů zatím nejsou.</Empty>;
  return (
    <Card title={`Hráči ${seasonLabel(season)} – základní část`}>
      <Leaders rows={rows} showTeam={false} />
    </Card>
  );
}

async function Attendance({ teamId, season }: { teamId: string; season: number }) {
  const [history, byOpp] = await Promise.all([getTeamAttendance(teamId), getAttendanceByOpponent(teamId, season)]);
  if (history.length === 0) return <Empty>Údaje o návštěvnosti zatím nejsou.</Empty>;
  const reg = history.filter((h) => h.phase === "regular").sort((a, b) => a.season - b.season);
  const cur = history.find((h) => h.season === season && h.phase === "regular");
  const po = history.find((h) => h.season === season && h.phase === "playoff");
  const best = [...reg].sort((a, b) => b.avg - a.avg)[0];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Průměr – základní část" value={cur?.avg.toLocaleString("cs-CZ") ?? "–"} sub={cur ? `max ${cur.max.toLocaleString("cs-CZ")} · min ${cur.min.toLocaleString("cs-CZ")}` : undefined} />
        <Stat label="Průměr – play-off" value={po?.avg.toLocaleString("cs-CZ") ?? "–"} sub={po ? `${po.games} zápasů` : "nehráli"} />
        <Stat label="Vyprodáno" value={`${(cur?.sold_out ?? 0) + (po?.sold_out ?? 0)}×`} sub={cur?.avg_capacity ? `kapacita ${cur.avg_capacity.toLocaleString("cs-CZ")}` : undefined} />
        <Stat label="Zaplněnost" value={cur?.fill_pct != null ? `${cur.fill_pct} %` : "–"} sub={best ? `rekordní sezóna ${seasonLabel(best.season)}` : undefined} />
      </div>
      {reg.length > 1 ? (
        <Card title="Průměrná domácí návštěva podle sezón">
          <BarChart
            bars={reg.map((h) => ({
              key: String(h.season),
              label: seasonLabel(h.season),
              value: h.avg,
              note: `${h.sold_out}× vyprodáno${h.fill_pct != null ? ` · zaplněnost ${h.fill_pct} %` : ""}`,
              highlight: h.season === season,
            }))}
          />
        </Card>
      ) : null}
      <Card title={`Na koho se chodí ${seasonLabel(season)}`}>
        <table className="w-full text-sm tabular">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th className="py-2 text-left">Soupeř</th>
              <th className="text-right">Zápasy</th>
              <th className="text-right font-bold">Průměr</th>
              <th className="text-right">Vyprodáno</th>
              <th className="text-right">Zaplněnost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {byOpp.map((o) => (
              <tr key={o.opponent_id} className="hover:bg-surface-2">
                <td className="py-1.5">
                  <Link href={`/tym/${o.opponent_id}`} className="hover:text-accent">
                    {o.opponent_name}
                  </Link>
                </td>
                <td className="text-right">{o.games}</td>
                <td className="text-right font-bold">{o.avg.toLocaleString("cs-CZ")}</td>
                <td className="text-right">{o.sold_out}</td>
                <td className="text-right">
                  <FillBar pct={o.fill_pct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Sezóny">
        <table className="w-full text-sm tabular">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th className="py-2 text-left">Sezóna</th>
              <th className="text-left">Fáze</th>
              <th className="text-right">Zápasy</th>
              <th className="text-right">Celkem</th>
              <th className="text-right font-bold">Průměr</th>
              <th className="text-right">Vyprodáno</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {history.map((h) => (
              <tr key={`${h.season}-${h.phase}`}>
                <td className="py-1.5">{seasonLabel(h.season)}</td>
                <td className="text-xs text-muted">{h.phase === "playoff" ? "play-off" : h.phase === "regular" ? "zákl. část" : "baráž"}</td>
                <td className="text-right">{h.games}</td>
                <td className="text-right">{h.total.toLocaleString("cs-CZ")}</td>
                <td className="text-right font-bold">{h.avg.toLocaleString("cs-CZ")}</td>
                <td className="text-right">{h.sold_out}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

async function History({ teamId }: { teamId: string }) {
  const [games, ranks] = await Promise.all([getAllTeamGames(teamId), getTeamFinalRanks(teamId)]);
  if (games.length === 0) return <Empty>Historie zatím není stažená.</Empty>;
  const seasons = [...new Set(games.map((g) => g.season!).filter(Boolean))].sort((a, b) => b - a);
  const rankBy = new Map(ranks.map((r) => [r.season, r]));
  return (
    <Card title="Sezóny v extralize">
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[560px] text-sm tabular">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th className="py-2 text-left">Sezóna</th>
              <th className="text-right">Pořadí</th>
              <th className="text-right">Z</th>
              <th className="text-right">V-VP-PP-P</th>
              <th className="text-right">Skóre</th>
              <th className="text-right font-bold">B</th>
              <th className="text-left pl-4">Play-off</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {seasons.map((s) => {
              const reg = record(teamId, games.filter((g) => g.season === s && g.phase === "regular"));
              const po = games.filter((g) => g.season === s && g.phase === "playoff");
              const lastPo = po.at(-1);
              return (
                <tr key={s} className="hover:bg-surface-2">
                  <td className="py-1.5">
                    <Link href={`/tym/${teamId}?sezona=${s}`} className="hover:text-accent">
                      {seasonLabel(s)}
                    </Link>
                  </td>
                  <td className="text-right font-semibold">{rankBy.get(s)?.rank ? `${rankBy.get(s)!.rank}.` : "–"}</td>
                  <td className="text-right">{reg?.gp ?? "–"}</td>
                  <td className="text-right">{reg ? `${reg.w}-${reg.otw}-${reg.otl}-${reg.l}` : "–"}</td>
                  <td className="text-right">{reg ? `${reg.gf}:${reg.ga}` : "–"}</td>
                  <td className="text-right font-bold">{reg?.pts ?? "–"}</td>
                  <td className="pl-4 text-xs text-muted">{lastPo?.round ?? (po.length ? "play-off" : "")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
