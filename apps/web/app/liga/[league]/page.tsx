import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Crosshair, Goal, ListOrdered, Shield, Shirt, TrendingUp, Trophy, Users } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { ClubLogo } from "@/components/club-logo";
import { notFound } from "next/navigation";
import { getLeague } from "@hokejhub/core";
import { Leaders } from "@/components/league/leaders";
import { PlayerPhoto } from "@/components/player-photo";
import { Standings } from "@/components/league/standings";
import { BarChart } from "@/components/ui/bar-chart";
import { Card, Empty, Stat } from "@/components/ui/card";
import { FillBar } from "@/components/ui/fill-bar";
import { SeasonSelect } from "@/components/ui/season-select";
import { seasonLabel } from "@/lib/format";
import { UrlTabs } from "@/components/ui/url-tabs";
import { CardSkeleton } from "@/components/ui/skeletons";
import { dbAvailable } from "@/lib/server/db";
import { getLiveElhGames, withPendingFinals } from "@/lib/server/live-table";
import {
  getLeagueAttendance,
  getLeagueAttendanceByTeam,
  getLeagueGoalies,
  getLeagueSeasons,
  getLeagueSkaters,
  getOfficialStandings,
  getSeasonGames,
  getTeamShortNames,
  getTeamLogos,
  toResultGames,
} from "@/lib/server/queries";
import { buildPlayoffBracket, computeStandings, CS, csCount, ELH_WINS_NEEDED, rulesForSeason } from "@hokejhub/core";
import { PlayoffBracket } from "@/components/league/bracket";
import { Network } from "lucide-react";

export const revalidate = 300;

const TABS = [
  { id: "tabulka", label: "Tabulka" },
  { id: "bodovani", label: "Kanadské bodování" },
  { id: "strelci", label: "Střelci" },
  { id: "xg", label: "xG" },
  { id: "brankari", label: "Brankáři" },
  { id: "navstevnost", label: "Návštěvnost" },
  { id: "historie", label: "Historie" },
];

export async function generateMetadata(props: PageProps<"/liga/[league]">): Promise<Metadata> {
  const { league } = await props.params;
  return { title: getLeague(league).name };
}

export default async function LeaguePage(props: PageProps<"/liga/[league]">) {
  const { league } = await props.params;
  const sp = await props.searchParams;
  const info = getLeague(league);
  if (!dbAvailable()) return <Empty>Databáze není připojena.</Empty>;
  const seasons = (await getLeagueSeasons(league)).map((s) => s.season);
  if (seasons.length === 0) notFound();
  const season = seasons.includes(Number(sp.sezona)) ? Number(sp.sezona) : seasons[0]!;
  const tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as string) : "tabulka";
  const phase = sp.faze === "playoff" ? "playoff" : "regular";

  return (
    <div className="space-y-4">
      <PageHero kicker={league === "nhl" ? "Severní Amerika" : "Česko"} title={info.name} icon={Trophy} />
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          <PhaseSwitch phase={phase} league={league} season={season} tab={tab} />
          <SeasonSelect seasons={seasons} value={season} />
        </div>
      </div>
      <UrlTabs tabs={phase === "playoff" ? TABS.map((t) => (t.id === "tabulka" ? { ...t, label: "Pavouk" } : t)) : TABS} active={tab} layoutId="league-tab" />
      <Suspense key={`${tab}-${season}-${phase}`} fallback={<CardSkeleton rows={14} />}>
        {tab === "tabulka" ? (
          phase === "playoff" ? <PlayoffTab league={league} season={season} /> : <TableTab league={league} season={season} phase={phase} />
        ) : null}
        {tab === "bodovani" ? <SkatersTab league={league} season={season} phase={phase} sort="pts" /> : null}
        {tab === "strelci" ? <SkatersTab league={league} season={season} phase={phase} sort="g" /> : null}
        {tab === "xg" ? <SkatersTab league={league} season={season} phase={phase} sort="xg" /> : null}
        {tab === "brankari" ? <GoaliesTab league={league} season={season} phase={phase} /> : null}
        {tab === "navstevnost" ? <AttendanceTab league={league} season={season} /> : null}
        {tab === "historie" ? <HistoryTab league={league} season={season} /> : null}
      </Suspense>
    </div>
  );
}

function PhaseSwitch({ phase, league, season, tab }: { phase: string; league: string; season: number; tab: string }) {
  const href = (f: string) => `/liga/${league}?sezona=${season}${tab !== "tabulka" ? `&tab=${tab}` : ""}${f === "playoff" ? "&faze=playoff" : ""}`;
  return (
    <div className="flex rounded-lg bg-surface-2 p-0.5 text-xs font-semibold">
      {[
        ["regular", "Základní část"],
        ["playoff", "Play-off"],
      ].map(([f, label]) => (
        <Link key={f} href={href(f!)} className={`rounded-md px-2.5 py-1.5 ${phase === f ? "bg-surface text-fg shadow-sm" : "text-muted"}`}>
          {label}
        </Link>
      ))}
    </div>
  );
}

async function PlayoffTab({ league, season }: { league: string; season: number }) {
  const [rows, regular, logos, seasons] = await Promise.all([
    getSeasonGames(league, season, "playoff"),
    getSeasonGames(league, season, "regular"),
    getTeamLogos(league, season),
    getLeagueSeasons(league),
  ]);
  const games = rows
    .filter((g) => g.status === "final" && g.home_score !== null && g.away_score !== null)
    .map((g) => ({ ...toResultGames([g])[0]!, round: g.round }));
  if (games.length === 0) return <Empty>Play-off této sezóny zatím nezačalo nebo pro něj nemáme data.</Empty>;
  const seeds = new Map(computeStandings(toResultGames(regular), { rules: rulesForSeason(season) }).map((r, i) => [r.teamId, i + 1]));
  const inProgress = seasons[0]?.season === season && league === "cz-elh";
  const stages = buildPlayoffBracket(games, seeds, inProgress ? ELH_WINS_NEEDED : {});
  return (
    <Card title={`Play-off ${seasonLabel(season)}`} icon={Network}>
      <PlayoffBracket stages={stages} logos={logos} />
    </Card>
  );
}

async function TableTab({ league, season, phase }: { league: string; season: number; phase: string }) {
  const seasons = await getLeagueSeasons(league);
  const isCurrent = seasons[0]?.season === season;
  const [rows, logos, shortNames, live] = await Promise.all([
    getSeasonGames(league, season, phase),
    getTeamLogos(league, isCurrent ? undefined : season),
    getTeamShortNames(league).catch(() => ({}) as Record<string, string>),
    isCurrent && league === "cz-elh" ? getLiveElhGames().catch(() => []) : Promise.resolve([]),
  ]);
  // Results the crawler has not stored yet come from the live feed (current regular season).
  const stored = toResultGames(rows);
  const games = isCurrent && league === "cz-elh" && phase === "regular" ? await withPendingFinals(stored, season).catch(() => stored) : stored;
  if (games.length === 0) {
    const official = (await getOfficialStandings(league, season)).filter((r) => r.split === "overall");
    if (official.length === 0) return <Empty>Pro tuto sezónu zatím nejsou výsledky.</Empty>;
    return <OfficialTable rows={official} />;
  }
  return (
    <Card title={`Tabulka ${seasonLabel(season)} · ${csCount(games.length, CS.zapas)}`} icon={ListOrdered}>
      <Standings games={games} season={season} logos={logos} shortNames={shortNames} liveGames={live} />
    </Card>
  );
}

function OfficialTable({ rows }: { rows: Awaited<ReturnType<typeof getOfficialStandings>> }) {
  return (
    <Card title="Oficiální konečná tabulka (hokej.cz)" icon={ListOrdered}>
      <table className="w-full text-sm tabular">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            <th className="py-2 text-left">#</th>
            <th className="text-left">Tým</th>
            <th className="text-right">Z</th>
            <th className="text-right">V</th>
            <th className="text-right">VP</th>
            <th className="text-right">R</th>
            <th className="text-right">PP</th>
            <th className="text-right">P</th>
            <th className="text-right">Skóre</th>
            <th className="text-right font-bold">B</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.team_name}>
              <td className="py-2">{r.rank}</td>
              <td className="font-medium">{r.team_name}</td>
              <td className="text-right">{r.gp}</td>
              <td className="text-right">{r.w}</td>
              <td className="text-right">{r.otw}</td>
              <td className="text-right">{r.ties ?? "–"}</td>
              <td className="text-right">{r.otl}</td>
              <td className="text-right">{r.l}</td>
              <td className="text-right">
                {r.gf}:{r.ga}
              </td>
              <td className="text-right font-bold">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

async function SkatersTab({ league, season, phase, sort }: { league: string; season: number; phase: string; sort: "pts" | "g" | "xg" }) {
  const rows = await getLeagueSkaters(league, season, phase, 400);
  if (rows.length === 0) return <Empty>Statistiky hráčů zatím nejsou.</Empty>;
  return (
    <Card
      icon={sort === "xg" ? Crosshair : sort === "g" ? Goal : TrendingUp}
      title={sort === "xg" ? "Očekávané góly a efektivita zakončení" : sort === "g" ? "Tabulka střelců" : "Kanadské bodování"}
    >
      <Leaders rows={rows} initialSort={sort} />
      {sort === "xg" ? (
        <p className="mt-2 text-[11px] text-muted">
          G−xG: kolik gólů hráč dal nad (nebo pod) očekávání podle kvality svých střel. Kladné číslo = nadprůměrný zakončovatel nebo štěstí.
        </p>
      ) : null}
    </Card>
  );
}

async function GoaliesTab({ league, season, phase }: { league: string; season: number; phase: string }) {
  const rows = await getLeagueGoalies(league, season, phase);
  if (rows.length === 0) return <Empty>Statistiky brankářů zatím nejsou.</Empty>;
  return (
    <Card title="Brankáři" icon={Shield}>
      <table className="w-full text-sm tabular">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            <th className="py-2 text-left">Brankář</th>
            <th className="text-left">Tým</th>
            <th className="text-right">Z</th>
            <th className="text-right">Zákroky</th>
            <th className="text-right">Góly</th>
            <th className="text-right font-bold">Úsp. %</th>
            <th className="text-right">Průměr</th>
            <th className="text-right">Nuly</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.player_id} className="hover:bg-surface-2">
              <td className="py-1.5 font-medium">
                <PlayerPhoto src={r.headshot} alt={r.name} size={40} className="mr-2 align-middle" />
                <Link href={`/hrac/${r.player_id}`} className="hover:text-accent">
                  {r.name}
                </Link>
              </td>
              <td className="text-muted">
                <span className="flex items-center gap-1.5">
                  <ClubLogo src={r.team_logo} alt={r.team_abbrev} size={22} />
                  {r.team_abbrev}
                </span>
              </td>
              <td className="text-right">{r.gp}</td>
              <td className="text-right">{r.saves}</td>
              <td className="text-right">{r.ga}</td>
              <td className="text-right font-bold">{r.sv_pct?.toFixed(2) ?? "–"}</td>
              <td className="text-right">{r.gaa?.toFixed(2) ?? "–"}</td>
              <td className="text-right">{r.shutouts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

async function AttendanceTab({ league, season }: { league: string; season: number }) {
  const [history, teams] = await Promise.all([getLeagueAttendance(league), getLeagueAttendanceByTeam(league, season)]);
  const reg = history.filter((h) => h.phase === "regular").sort((a, b) => a.season - b.season);
  const cur = history.find((h) => h.season === season && h.phase === "regular");
  const po = history.find((h) => h.season === season && h.phase === "playoff");
  if (!cur && teams.length === 0) return <Empty>Údaje o návštěvnosti zatím nejsou.</Empty>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Průměr – základní část" value={cur?.avg.toLocaleString("cs-CZ") ?? "–"} sub={cur ? csCount(cur.games, CS.zapas) : undefined} />
        <Stat label="Průměr – play-off" value={po?.avg.toLocaleString("cs-CZ") ?? "–"} sub={po ? csCount(po.games, CS.zapas) : undefined} />
        <Stat label="Celkem diváků" value={((cur?.total ?? 0) + (po?.total ?? 0)).toLocaleString("cs-CZ")} />
        <Stat label="Vyprodáno" value={(cur?.sold_out ?? 0) + (po?.sold_out ?? 0)} sub={cur?.fill_pct ? `zaplněnost ${cur.fill_pct} %` : undefined} />
      </div>
      {reg.length > 1 ? (
        <Card title="Průměrná návštěvnost základní části podle sezón" icon={Users}>
          <BarChart
            bars={reg.map((h) => ({
              key: String(h.season),
              label: seasonLabel(h.season),
              value: h.avg,
              note: `${h.sold_out}× vyprodáno · rekord ${h.record.toLocaleString("cs-CZ")}`,
              highlight: h.season === season,
            }))}
          />
        </Card>
      ) : null}
      <Card title={`Týmy ${seasonLabel(season)}`} icon={Shirt}>
        <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[560px] text-sm tabular">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-2 text-left">Tým</th>
                <th className="text-left">Fáze</th>
                <th className="text-right">Zápasy</th>
                <th className="text-right font-bold">Průměr doma</th>
                <th className="text-right">Maximum</th>
                <th className="text-right">Vyprodáno</th>
                <th className="text-right">Zaplněnost</th>
                <th className="text-right" title="Kolik lidí chodí na tým venku">
                  Ø venku
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {teams.map((t) => (
                <tr key={`${t.team_id}-${t.phase}`} className="hover:bg-surface-2">
                  <td className="py-1.5 font-medium">
                    <Link href={`/tym/${t.team_id}?tab=navstevnost`} className="hover:text-accent">
                      {t.team_name}
                    </Link>
                  </td>
                  <td className="text-xs text-muted">{t.phase === "playoff" ? "play-off" : t.phase === "regular" ? "zákl. část" : t.phase}</td>
                  <td className="text-right">{t.games}</td>
                  <td className="text-right font-bold">{t.avg.toLocaleString("cs-CZ")}</td>
                  <td className="text-right">{t.max.toLocaleString("cs-CZ")}</td>
                  <td className="text-right">{t.sold_out}</td>
                  <td className="text-right">
                    <FillBar pct={t.fill_pct} />
                  </td>
                  <td className="text-right text-muted">{t.road_avg?.toLocaleString("cs-CZ") ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Zaplněnost a vyprodání počítáme proti kapacitě stadionu uváděné na hokej.cz (u starších sezón jde o současnou kapacitu).
        </p>
      </Card>
    </div>
  );
}

async function HistoryTab({ league, season }: { league: string; season: number }) {
  const rows = await getOfficialStandings(league, season);
  const overall = rows.filter((r) => r.split === "overall");
  if (overall.length === 0) return <Empty>Oficiální tabulka pro tuto sezónu zatím není stažená.</Empty>;
  return <OfficialTable rows={overall} />;
}
