import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ShotEvent } from "@hokejhub/core";
import { PlayerPhoto } from "@/components/player-photo";
import { ShotMap } from "@/components/shot-map";
import { Card, Empty, Stat } from "@/components/ui/card";
import { SeasonSelect } from "@/components/ui/season-select";
import { seasonLabel } from "@/lib/format";
import { UrlTabs } from "@/components/ui/url-tabs";
import { fmtToi } from "@/lib/names";
import { dbAvailable } from "@/lib/server/db";
import {
  getPlayer,
  getPlayerGameLog,
  getPlayerGoalieSeasons,
  getPlayerMilestones,
  getPlayerSeasons,
  getPlayerShots,
} from "@/lib/server/queries";

export const revalidate = 300;

const TABS = [
  { id: "kariera", label: "Kariéra" },
  { id: "zapasy", label: "Zápasy" },
  { id: "strely", label: "Střely" },
  { id: "milniky", label: "Milníky" },
];

const MILESTONE: Record<string, (v: number) => string> = {
  career_gp: (v) => `${v}. zápas v extralize`,
  club_gp: (v) => `${v}. zápas za klub`,
  career_g: (v) => `${v}. gól v extralize`,
  club_g: (v) => `${v}. gól za klub`,
  career_pts: (v) => `${v}. bod v extralize`,
  club_pts: (v) => `${v}. bod za klub`,
};

const POS: Record<string, string> = { D: "obránce", F: "útočník", G: "brankář", O: "obránce", Ú: "útočník", B: "brankář" };

function age(birth: string) {
  const b = new Date(birth);
  const n = new Date();
  return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
}

export async function generateMetadata(props: PageProps<"/hrac/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  if (!dbAvailable()) return { title: "Hráč" };
  return { title: (await getPlayer(id))?.name ?? "Hráč" };
}

export default async function PlayerPage(props: PageProps<"/hrac/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  if (!dbAvailable()) return <Empty>Databáze není připojena.</Empty>;
  const player = await getPlayer(id);
  if (!player) notFound();
  const [seasons, goalie] = await Promise.all([getPlayerSeasons(id), getPlayerGoalieSeasons(id)]);
  const seasonList = [...new Set([...seasons.map((s) => s.season), ...goalie.map((s) => s.season)])].sort((a, b) => b - a);
  const season = seasonList.includes(Number(sp.sezona)) ? Number(sp.sezona) : (seasonList[0] ?? 0);
  const tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as string) : "kariera";
  const isGoalie = goalie.length > 0 && seasons.every((s) => s.gp === 0 || goalie.some((g) => g.season === s.season));

  const reg = seasons.filter((s) => s.phase === "regular");
  const totals = reg.reduce(
    (a, s) => ({ gp: a.gp + s.gp, g: a.g + s.g, a: a.a + s.a, pts: a.pts + s.pts, xg: a.xg + (s.xg ?? 0), pm: a.pm + s.pm }),
    { gp: 0, g: 0, a: 0, pts: 0, xg: 0, pm: 0 },
  );
  const currentTeam = seasons[0];

  return (
    <div className="space-y-4">
      <header className="rise relative overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "radial-gradient(60% 120% at 100% 0%, var(--accent-soft), transparent)" }} />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-4">
          <PlayerPhoto src={player.headshot} alt={player.name} size={96} className="shadow-xl" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              {player.position ? POS[player.position] ?? player.position : isGoalie ? "brankář" : "hráč"}
              {player.current_team_id || currentTeam ? (
                <>
                  {" · "}
                  <Link href={`/tym/${player.current_team_id ?? currentTeam!.team_id}`} className="hover:text-fg">
                    {player.current_team_name ?? currentTeam!.team_name}
                  </Link>
                </>
              ) : null}
            </p>
            <h1 className="text-3xl font-black tracking-tight">{player.name}</h1>
            <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted">
              {player.birth_date ? (
                <span>
                  {age(player.birth_date)} let · nar. {new Date(player.birth_date).toLocaleDateString("cs-CZ")}
                </span>
              ) : null}
              {player.height_cm ? <span>{player.height_cm} cm</span> : null}
              {player.weight_kg ? <span>{player.weight_kg} kg</span> : null}
              {player.shoots ? <span>hůl {player.shoots === "L" ? "levá" : "pravá"}</span> : null}
            </p>
          </div>
          </div>
          {seasonList.length ? <SeasonSelect seasons={seasonList} value={season} /> : null}
        </div>
        {!isGoalie && totals.gp ? (
          <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Stat label="Zápasy ELH" value={totals.gp} />
            <Stat label="Góly" value={totals.g} />
            <Stat label="Asistence" value={totals.a} />
            <Stat label="Body" value={totals.pts} sub={`${(totals.pts / totals.gp).toFixed(2)} na zápas`} />
            <Stat label="xG" value={totals.xg.toFixed(1)} sub={`G−xG ${totals.g - totals.xg >= 0 ? "+" : ""}${(totals.g - totals.xg).toFixed(1)} (sezóny se střelami)`} />
          </div>
        ) : null}
      </header>
      <UrlTabs tabs={TABS} active={tab} layoutId="player-tab" />

      {tab === "kariera" ? (
        <div className="space-y-4">
          {seasons.length ? (
            <Card title="Bruslař – po sezónách">
              <div className="-mx-4 overflow-x-auto px-4">
                <table className="w-full min-w-[720px] text-sm tabular">
                  <thead>
                    <tr className="border-b border-line text-xs text-muted">
                      <th className="py-2 text-left">Sezóna</th>
                      <th className="text-left">Tým</th>
                      <th className="text-left">Fáze</th>
                      <th className="text-right">Z</th>
                      <th className="text-right">G</th>
                      <th className="text-right">A</th>
                      <th className="text-right font-bold">B</th>
                      <th className="text-right">+/−</th>
                      <th className="text-right">TM</th>
                      <th className="text-right">S</th>
                      <th className="text-right">xG</th>
                      <th className="text-right">G−xG</th>
                      <th className="text-right">TOI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {seasons.map((s) => (
                      <tr key={`${s.season}-${s.phase}-${s.team_id}`} className={`hover:bg-surface-2 ${s.season === season ? "bg-accent-soft" : ""}`}>
                        <td className="py-1.5">{seasonLabel(s.season)}</td>
                        <td>
                          <Link href={`/tym/${s.team_id}?sezona=${s.season}`} className="hover:text-accent">
                            {s.team_abbrev}
                          </Link>
                        </td>
                        <td className="text-xs text-muted">{s.phase === "playoff" ? "play-off" : s.phase === "regular" ? "ZČ" : s.phase}</td>
                        <td className="text-right">{s.gp}</td>
                        <td className="text-right">{s.g}</td>
                        <td className="text-right">{s.a}</td>
                        <td className="text-right font-bold">{s.pts}</td>
                        <td className={`text-right ${s.pm > 0 ? "text-win" : s.pm < 0 ? "text-live" : ""}`}>{s.pm > 0 ? `+${s.pm}` : s.pm}</td>
                        <td className="text-right">{s.pim}</td>
                        <td className="text-right">{s.sog}</td>
                        <td className="text-right">{s.xg?.toFixed(2) ?? "–"}</td>
                        <td className="text-right">{s.xg != null ? `${s.g - s.xg >= 0 ? "+" : ""}${(s.g - s.xg).toFixed(2)}` : "–"}</td>
                        <td className="text-right">{fmtToi(s.toi_avg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
          {goalie.length ? (
            <Card title="Brankář – po sezónách">
              <table className="w-full text-sm tabular">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="py-2 text-left">Sezóna</th>
                    <th className="text-left">Tým</th>
                    <th className="text-left">Fáze</th>
                    <th className="text-right">Z</th>
                    <th className="text-right">Zákroky</th>
                    <th className="text-right">Góly</th>
                    <th className="text-right font-bold">Úsp. %</th>
                    <th className="text-right">Průměr</th>
                    <th className="text-right">Nuly</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {goalie.map((s) => (
                    <tr key={`${s.season}-${s.phase}`}>
                      <td className="py-1.5">{seasonLabel(s.season)}</td>
                      <td>{s.team_abbrev}</td>
                      <td className="text-xs text-muted">{s.phase === "playoff" ? "play-off" : "ZČ"}</td>
                      <td className="text-right">{s.gp}</td>
                      <td className="text-right">{s.saves}</td>
                      <td className="text-right">{s.ga}</td>
                      <td className="text-right font-bold">{s.sv_pct?.toFixed(2) ?? "–"}</td>
                      <td className="text-right">{s.gaa?.toFixed(2) ?? "–"}</td>
                      <td className="text-right">{s.shutouts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : null}
          {!seasons.length && !goalie.length ? <Empty>Zatím žádné statistiky.</Empty> : null}
        </div>
      ) : null}
      {tab === "zapasy" ? <GameLog id={id} season={season} /> : null}
      {tab === "strely" ? <Shots id={id} season={season} /> : null}
      {tab === "milniky" ? <Milestones id={id} /> : null}
    </div>
  );
}

async function GameLog({ id, season }: { id: string; season: number }) {
  const log = await getPlayerGameLog(id, season);
  if (!log.length) return <Empty>Žádné zápasy v této sezóně.</Empty>;
  return (
    <Card title={`Zápasy ${seasonLabel(season)}`}>
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[560px] text-sm tabular">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th className="py-2 text-left">Datum</th>
              <th className="text-left">Soupeř</th>
              <th className="text-right">Výsledek</th>
              <th className="text-right">G</th>
              <th className="text-right">A</th>
              <th className="text-right">+/−</th>
              <th className="text-right">S</th>
              <th className="text-right">xG</th>
              <th className="text-right">TOI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {log.map((r) => {
              const won = r.gf > r.ga;
              return (
                <tr key={r.game_id} className="hover:bg-surface-2">
                  <td className="py-1.5 text-muted">{new Date(r.start_at).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}</td>
                  <td>
                    <span className="text-xs text-muted">{r.home ? "vs" : "@"}</span> {r.opp_name}
                  </td>
                  <td className="text-right">
                    <Link href={`/zapas/${r.game_id}`} className={`font-semibold hover:underline ${won ? "text-win" : "text-live"}`}>
                      {r.gf}:{r.ga}
                      {r.decided_in && r.decided_in !== "REG" ? ` ${r.decided_in === "OT" ? "PP" : "SN"}` : ""}
                    </Link>
                  </td>
                  <td className={`text-right ${r.g ? "font-bold" : "text-muted"}`}>{r.g}</td>
                  <td className={`text-right ${r.a ? "font-bold" : "text-muted"}`}>{r.a}</td>
                  <td className="text-right">{r.pm > 0 ? `+${r.pm}` : r.pm}</td>
                  <td className="text-right">{r.sog}</td>
                  <td className="text-right">{r.xg?.toFixed(2) ?? "–"}</td>
                  <td className="text-right">{fmtToi(r.toi_s)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const RESULT_TYPE: Record<string, ShotEvent["type"]> = { goal: "goal", saved: "shot-on-goal", missed: "missed-shot", blocked: "blocked-shot" };

async function Shots({ id, season }: { id: string; season: number }) {
  const rows = await getPlayerShots(id, season);
  if (!rows.length) return <Empty>Pro tuto sezónu nemáme souřadnice střel.</Empty>;
  const shots: ShotEvent[] = rows.map((r) => ({
    seq: r.seq + Number(r.game_id.replace(/\D/g, "")) * 10000,
    period: r.period,
    periodSeconds: r.period_seconds,
    type: RESULT_TYPE[r.result] ?? "shot-on-goal",
    teamId: "me",
    shooterId: null,
    goalieId: null,
    x: r.x,
    y: r.y,
    shotType: null,
    situationCode: null,
    strength: (r.situation as ShotEvent["strength"]) ?? undefined,
    xg: r.xg ?? undefined,
  }));
  const xg = shots.reduce((a, s) => a + (s.xg ?? 0), 0);
  const goals = shots.filter((s) => s.type === "goal").length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Pokusy" value={shots.length} />
        <Stat label="Góly" value={goals} />
        <Stat label="xG" value={xg.toFixed(2)} />
        <Stat label="Góly nad očekávání" value={`${goals - xg >= 0 ? "+" : ""}${(goals - xg).toFixed(2)}`} />
      </div>
      <Card title={`Všechny střely ${seasonLabel(season)}`}>
        <ShotMap shots={shots} homeId="me" players={null} homeAbbrev="Hráč" awayAbbrev="–" />
      </Card>
    </div>
  );
}

async function Milestones({ id }: { id: string }) {
  const list = await getPlayerMilestones(id);
  if (!list.length) return <Empty>Zatím žádné kulaté milníky v naší databázi.</Empty>;
  return (
    <Card title="Milníky">
      <ol className="relative space-y-3 border-l border-line pl-5">
        {list.map((m) => (
          <li key={`${m.kind}-${m.value}-${m.game_id}`} className="relative">
            <span className="absolute -left-[26px] top-1 grid size-3 place-items-center rounded-full bg-gold ring-4 ring-surface" />
            <div className="font-semibold">{MILESTONE[m.kind]?.(m.value) ?? `${m.kind} ${m.value}`}</div>
            <Link href={`/zapas/${m.game_id}`} className="text-xs text-muted hover:text-accent">
              {new Date(m.start_at).toLocaleDateString("cs-CZ")}
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] text-muted">Počítáno z odehraných zápasů v naší databázi (extraliga od 1992/93).</p>
    </Card>
  );
}
