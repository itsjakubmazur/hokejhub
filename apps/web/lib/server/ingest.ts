import {
  addDays,
  esportsUrls,
  feedScheduleRow,
  hokejczOnlineUrl,
  hokejczShotsUrl,
  INSERT_ONLY,
  jobPath,
  onlajnyMatchUrls,
  parseScoreboard,
  parseScoreboardAlt,
  pragueDate,
  seasonOfDate,
  PRIMARY_KEYS,
  processJob,
  processS3Match,
  TABLE_OF,
  WRITE_ORDER,
  type CrawlJob,
  type Game,
  type Rows,
} from "@hokejhub/core";
import { fetchJson } from "./fetcher";
import { sql } from "./db";
import { refreshAfterIngest } from "./stats-refresh";
import { supabaseAdmin } from "./supabase";

/** Writing crawled hokej.cz pages into the database: shared by the crawler and instant ingest. */

const ORIGIN = process.env.HOKEJCZ_ORIGIN ?? "https://www.hokej.cz/";
const USER_AGENT = "HokejHub/0.1 (personal, non-commercial)";

function dedupe(rows: Record<string, unknown>[], pk: string) {
  const keys = pk.split(",");
  const map = new Map<string, Record<string, unknown>>();
  for (const r of rows) map.set(keys.map((k) => String(r[k])).join("|"), r);
  return [...map.values()];
}

export async function writeRows(rows: Rows) {
  const db = supabaseAdmin();
  for (const table of WRITE_ORDER) {
    const list = rows[table];
    if (list.length === 0) continue;
    const pk = PRIMARY_KEYS[table];
    const { error } = await db
      .from(TABLE_OF[table] ?? table)
      .upsert(dedupe(list, pk), { onConflict: pk, ignoreDuplicates: INSERT_ONLY.includes(table) });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

export async function enqueue(list: CrawlJob[]) {
  if (list.length === 0) return;
  const { error } = await supabaseAdmin()
    .from("crawl_job")
    .upsert(
      list.map((j) => ({ key: j.key, kind: j.kind, params: j.params, priority: j.priority })),
      { onConflict: "key", ignoreDuplicates: true },
    );
  if (error) throw new Error(`crawl_job: ${error.message}`);
}

/** hokej.cz refusing or struggling, as opposed to a page that is not there. */
export const isUnavailable = (msg: string) => /HTTP (403|429|5\d\d)|timeout|aborted|fetch failed/i.test(msg);

export interface MatchIngest {
  final: boolean;
  source: "html" | "s3";
  /** Why the match page was not used (hokej.cz refused it), when the S3 files were. */
  htmlError?: string;
  /** Players of an S3 box score that got a name-based id. */
  unresolved?: string[];
  /** Nothing was written, and why (not final yet, already has a box score). */
  skipped?: string;
  jobs?: number;
}

/**
 * Stores one extraliga game: from its hokej.cz match page (and shot feed) when hokej.cz answers,
 * otherwise from the S3 files hokej.cz's own pages load (`ingestMatchFromS3`). `skipHtml` goes
 * straight to S3 — for a run that already saw hokej.cz refuse it.
 */
export async function ingestMatch(params: Record<string, unknown>, opts: { skipHtml?: boolean } = {}): Promise<MatchIngest> {
  let htmlError = "hokej.cz refused an earlier page";
  if (!opts.skipHtml) {
    const res = await fetch(new URL(jobPath({ kind: "match", params }), ORIGIN), {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    }).catch((e: unknown) => e instanceof Error ? e : new Error(String(e)));
    htmlError = res instanceof Error ? res.message : `HTTP ${res.status}`;
    if (!(res instanceof Error) && res.ok) {
      const html = await res.text();
      const s = await fetch(hokejczShotsUrl(Number(params.id)), { cache: "no-store", signal: AbortSignal.timeout(10_000) }).catch(() => null);
      const shots = s?.ok ? await s.json().catch(() => undefined) : undefined;
      const { rows, jobs } = processJob({ kind: "match", params }, html, shots);
      // The page is the authority: a box score stored from S3 goes (its rows may sit under other
      // player ids or event numbers); the game row's `external` is rewritten without the mark.
      const gameId = rows.game[0]?.id as string | undefined;
      if (gameId && rows.box_skater.length) {
        const [prev] = await sql<{ src: string | null }>("select external->>'boxScoreSource' as src from game where id = $1", [gameId]);
        if (prev?.src === "s3") await clearGameDetail(gameId);
      }
      await writeRows(rows);
      await enqueue(jobs);
      return { final: rows.game.some((g) => g.status === "final"), source: "html", jobs: jobs.length };
    }
    if (!isUnavailable(htmlError)) throw new Error(htmlError);
  }
  return { ...(await ingestMatchFromS3(Number(params.id))), htmlError };
}

/** Events and box score of one game, before they are written again from another source. */
async function clearGameDetail(gameId: string) {
  await sql("delete from game_event where game_id = $1", [gameId]);
  await sql("delete from box_skater where game_id = $1", [gameId]);
  await sql("delete from box_goalie where game_id = $1", [gameId]);
}

const fetchJsonOrNull = async (url: string): Promise<unknown> => {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (res.status === 403 || res.status === 404) return null; // S3 answers 403 for a missing key without list rights
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json().catch(() => null);
};

/**
 * Box score of a finished extraliga game from the JSON files on S3 that hokej.cz's own match
 * page loads (onlajny statistics, roster and summary; hokej.cz commentary and shot feed) — they
 * are not behind hokej.cz's Cloudflare, which refuses datacenter addresses. The game must be in
 * the database already (schedule); its result comes from the live feed, the files add goals,
 * penalties, box score, shots and team statistics. A game that already has a box score is left
 * alone: the match page, when it gets through, is more complete (PP/SH time, goalie time).
 */
export async function ingestMatchFromS3(hczId: number): Promise<MatchIngest> {
  const gameId = `hcz-${hczId}`;
  const [game] = await sql<{
    start_at: Date;
    status: string;
    decided_in: string | null;
    home_team_id: string;
    away_team_id: string;
    external: Record<string, unknown> | null;
  }>("select start_at, status, decided_in, home_team_id, away_team_id, external from game where id = $1", [gameId]);
  if (!game) throw new Error(`S3: ${gameId} is not in the database`);
  const has = await sql("select 1 from box_skater where game_id = $1 limit 1", [gameId]);
  if (has.length) return { final: game.status === "final", source: "s3", skipped: "has a box score" };

  // The onlajny id (the S3 files are keyed by it) and the result: from the live feed of that day.
  const day = pragueDate(new Date(game.start_at));
  let fromFeed: Game | undefined;
  for (const d of [day, addDays(day, -1), addDays(day, 1)]) {
    const board = await fetchJson(esportsUrls.scoreboard(d), parseScoreboard, { revalidate: 0, notFoundIsEmpty: true });
    fromFeed = board.data?.find((g) => g.leagueKey === "cz-elh" && g.external.hokejczId === hczId);
    if (fromFeed) break;
  }
  const onlajnyId = fromFeed?.external.onlajnyId ?? (Number(game.external?.onlajnyId) || null);
  if (!onlajnyId) throw new Error(`S3: no onlajny id for ${gameId}`);
  let final = game.status === "final";
  let decidedIn = game.decided_in;
  if (!final && fromFeed?.status === "final") {
    final = (await storeFeedResults([fromFeed])) > 0;
    decidedIn = fromFeed.decidedIn ?? "REG";
  }
  if (!final) return { final: false, source: "s3", skipped: "not final yet" };

  const season = seasonOf(new Date(game.start_at).toISOString());
  const [playerStats, summary, roster, shots, online] = await Promise.all([
    fetchJsonOrNull(onlajnyMatchUrls.playerStats(season, onlajnyId)),
    fetchJsonOrNull(onlajnyMatchUrls.summary(season, onlajnyId)),
    fetchJsonOrNull(onlajnyMatchUrls.roster(season, onlajnyId)),
    fetchJsonOrNull(hokejczShotsUrl(hczId)),
    fetchJsonOrNull(hokejczOnlineUrl(season, hczId)),
  ]);
  if (!playerStats || !summary) throw new Error(`S3: no statistics published for ${gameId} (onlajny ${onlajnyId}) yet`);

  // Players these two clubs fielded in the last year, to give everyone his hokej.cz id.
  const known = await sql<{ id: string; team_id: string; number: number | null; name: string }>(
    `select distinct on (b.player_id, b.team_id) b.player_id as id, b.team_id, b.number, p.name
     from (select game_id, player_id, team_id, number from box_skater
           union all select game_id, player_id, team_id, number from box_goalie) b
     join game g on g.id = b.game_id
     join player p on p.id = b.player_id
     where b.team_id in ($1, $2) and g.start_at > now() - interval '400 days' and b.player_id ~ '^hcz-[0-9]+$'
     order by b.player_id, b.team_id, g.start_at desc`,
    [game.home_team_id, game.away_team_id],
  );
  const r = processS3Match({
    gameId,
    homeTeamId: game.home_team_id,
    awayTeamId: game.away_team_id,
    decidedIn,
    playerStats,
    summary,
    roster,
    shots,
    online,
    known: known.map((k) => ({ id: k.id, teamId: k.team_id, number: k.number, name: k.name })),
  });
  // Players the database has keep their hokej.cz names; only new ones are added.
  const ids = r.rows.player.map((p) => String(p.id));
  const existing = new Set((await sql<{ id: string }>("select id from player where id = any($1)", [ids])).map((p) => p.id));
  r.rows.player = r.rows.player.filter((p) => !existing.has(String(p.id)));
  await clearGameDetail(gameId);
  await writeRows(r.rows);
  await sql(
    `update game set team_stats = $2::jsonb, referees = coalesce($3::text[], referees),
            external = coalesce(external, '{}'::jsonb) || $4::jsonb, updated_at = now()
     where id = $1`,
    [gameId, JSON.stringify(r.game.team_stats), r.game.referees, JSON.stringify({ ...r.game.external, onlajnyId })],
  );
  return { final: true, source: "s3", unresolved: r.unresolved };
}

const seasonOf = (iso: string) => {
  const d = new Date(iso);
  return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
};

/**
 * Stores extraliga games the live feed reports as finished but the database does not hold as
 * final yet — so tables, team pages and player stats are right minutes after the final horn,
 * not when the scheduled crawl comes. Each game is claimed through its crawl job so concurrent
 * callers do not fetch it twice, and retried at most every three minutes (hokej.cz publishes
 * the final box score a little after the horn).
 */
export async function ingestFinishedElh(games: Game[]) {
  if (!process.env.DATABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { stored: 0 };
  const done = games.filter((g) => g.leagueKey === "cz-elh" && g.status === "final" && g.external.hokejczId);
  if (done.length === 0) return { stored: 0 };
  const ids = done.map((g) => `hcz-${g.external.hokejczId}`);
  const known = await sql<{ id: string }>("select id from game where id = any($1) and status = 'final'", [ids]);
  const finalIds = new Set(known.map((r) => r.id));
  let stored = 0;
  const unreachable: Game[] = [];
  for (const g of done) {
    const hczId = g.external.hokejczId!;
    if (finalIds.has(`hcz-${hczId}`)) continue;
    const key = `hcz:match:${hczId}`;
    // Claim: an existing job not touched in the last three minutes, or a new one.
    const claimed = await sql<{ params: Record<string, unknown> }>(
      `update crawl_job set status = 'running', updated_at = now()
       where key = $1 and updated_at < now() - interval '3 minutes'
       returning params`,
      [key],
    );
    let params = claimed[0]?.params;
    if (!params) {
      const created = await sql<{ params: Record<string, unknown> }>(
        `insert into crawl_job (key, kind, params, priority, status, updated_at)
         values ($1, 'match', $2, 100, 'running', now()) on conflict (key) do nothing returning params`,
        [key, { id: hczId, season: seasonOf(g.startAt), phase: "regular" }],
      );
      params = created[0]?.params;
    }
    if (!params) continue; // somebody else has it, or it was tried a moment ago
    try {
      const r = await ingestMatch(params);
      // Not final on hokej.cz yet: leave it pending so the next caller (or the crawler) retries.
      await sql("update crawl_job set status = $2, attempts = 0, last_error = null, updated_at = now() where key = $1", [
        key,
        r.final ? "done" : "pending",
      ]);
      if (r.final) stored++;
    } catch (e) {
      await sql("update crawl_job set status = 'pending', last_error = $2, updated_at = now() where key = $1", [
        key,
        (e instanceof Error ? e.message : String(e)).slice(0, 500),
      ]);
      unreachable.push(g);
    }
  }
  // hokej.cz did not answer: keep at least the result, the crawler adds the box score later.
  const results = unreachable.length ? await storeFeedResults(unreachable).catch(() => 0) : 0;
  if (stored || results) await refreshAfterIngest().catch((e) => console.error("[ingest] refresh", e));
  return { stored, results };
}

/**
 * Result-only fallback for when hokej.cz cannot be read (it refuses some datacenter addresses for
 * days at a time): the final score, periods and how the game was decided are taken from the live
 * feed, which names games by their hokej.cz id. Only games the database already holds and does
 * not have as final are touched, so tables, Elo and tips stay right; goals and player statistics
 * follow once the crawler gets the match page (it keeps re-reading finals without a box score).
 */
export async function storeFeedResults(games: Game[]): Promise<number> {
  const done = games.filter(
    (g) => g.leagueKey === "cz-elh" && g.status === "final" && g.external.hokejczId && g.homeScore !== null && g.awayScore !== null,
  );
  if (done.length === 0) return 0;
  const open = await sql<{ id: string; home_team_id: string; away_team_id: string }>(
    "select id, home_team_id, away_team_id from game where id = any($1) and status <> 'final'",
    [done.map((g) => `hcz-${g.external.hokejczId}`)],
  );
  const byId = new Map(open.map((r) => [r.id, r]));
  let stored = 0;
  for (const g of done) {
    const row = byId.get(`hcz-${g.external.hokejczId}`);
    if (!row) continue;
    // Same game, same sides: where the feed knows the clubs they must match ours.
    if (g.home.hokejczClubId && `hcz-${g.home.hokejczClubId}` !== row.home_team_id) continue;
    if (g.away.hokejczClubId && `hcz-${g.away.hokejczClubId}` !== row.away_team_id) continue;
    // Regulation plus overtime, as the crawler stores them: a shootout is not a period.
    const periods = g.periods.slice(0, g.decidedIn === "OT" ? 4 : 3);
    if (g.decidedIn === "OT" && periods.length === 3) {
      // The feed lists regulation only: the overtime goal is what the final score adds to it.
      const ot: [number, number] = [g.homeScore! - periods.reduce((n, p) => n + p[0], 0), g.awayScore! - periods.reduce((n, p) => n + p[1], 0)];
      if (ot[0] + ot[1] === 1 && Math.min(...ot) === 0) periods.push(ot);
    }
    const updated = await sql<{ id: string }>(
      `update game set status = 'final', status_label = 'Konec', home_score = $2, away_score = $3, periods = $4::jsonb,
              decided_in = $5, updated_at = now()
       where id = $1 and status <> 'final' returning id`,
      [row.id, g.homeScore, g.awayScore, JSON.stringify(periods), g.decidedIn ?? "REG"],
    );
    stored += updated.length;
  }
  return stored;
}

/** Results of every played extraliga game the database still holds as unfinished, from the feed. */
export async function catchUpResultsFromFeed(): Promise<{ dates: number; stored: number }> {
  const days = await sql<{ d: string }>(
    `select distinct (start_at at time zone 'Europe/Prague')::date::text as d from game
     where league_id = 'cz-elh' and status not in ('final', 'cancelled')
       and start_at < now() - interval '150 minutes' and start_at > now() - interval '300 days'
     order by 1 limit 90`,
  );
  let stored = 0;
  for (const { d } of days) {
    const board = await fetchJson(esportsUrls.scoreboard(d), parseScoreboard, { revalidate: 0, notFoundIsEmpty: true });
    if (board.data) stored += await storeFeedResults(board.data);
  }
  if (stored) await refreshAfterIngest().catch((e) => console.error("[ingest] refresh", e));
  return { dates: days.length, stored };
}

/**
 * Adds the extraliga games the live feed lists from a week back to three weeks ahead that the
 * database does not have — the schedule hokej.cz's season pages gave the crawler before hokej.cz
 * started refusing datacenter addresses; above all the play-off and relegation rounds, which are
 * drawn as the season goes. Each new game gets its crawl job (box score once it is played).
 */
export async function scheduleFromFeed(back = 7, ahead = 21): Promise<{ dates: number; added: number; unmatched: string[] }> {
  const today = pragueDate();
  const dates: string[] = [];
  for (let d = -back; d <= ahead; d++) dates.push(addDays(today, d));
  const days = await Promise.all(
    dates.map(async (d) => {
      const [main, alt] = await Promise.all([
        fetchJson(esportsUrls.scoreboard(d), parseScoreboard, { revalidate: 0, notFoundIsEmpty: true }),
        fetchJson(esportsUrls.scoreboardAlt(d), parseScoreboardAlt, { revalidate: 0, notFoundIsEmpty: true }),
      ]);
      return { main: main.data ?? [], alt: alt.data ?? [] };
    }),
  );
  const games = new Map<string, Game>();
  const clubs = new Map<string, { home: number | null; away: number | null }>();
  for (const { main, alt } of days) {
    for (const g of main) if (g.leagueKey === "cz-elh" && g.external.hokejczId) games.set(g.id, g);
    for (const g of alt) clubs.set(g.id, { home: g.home.hokejczClubId ?? null, away: g.away.hokejczClubId ?? null });
  }
  if (!games.size) return { dates: dates.length, added: 0, unmatched: [] };
  const ids = [...games.values()].map((g) => `hcz-${g.external.hokejczId}`);
  const have = new Set((await sql<{ id: string }>("select id from game where id = any($1)", [ids])).map((r) => r.id));
  const missing = [...games.values()].filter((g) => !have.has(`hcz-${g.external.hokejczId}`));
  if (!missing.length) return { dates: dates.length, added: 0, unmatched: [] };

  const season = seasonOfDate();
  const teams = await sql<{ id: string; abbrev: string; name: string; regular: boolean }>(
    `select t.id, t.abbrev, t.name, bool_or(g.phase = 'regular') as regular
     from game g join team t on t.id in (g.home_team_id, g.away_team_id)
     where g.league_id = 'cz-elh' and g.season = $1 group by t.id, t.abbrev, t.name`,
    [season],
  );
  const regularTeams = new Set(teams.filter((t) => t.regular).map((t) => t.id));
  const rows: Record<string, unknown>[] = [];
  const jobs: CrawlJob[] = [];
  const unmatched: string[] = [];
  for (const g of missing) {
    const r = feedScheduleRow({ game: g, clubs: clubs.get(g.id) ?? { home: null, away: null }, teams, regularTeams });
    if (!r) {
      unmatched.push(`${g.startAt.slice(0, 10)} ${g.home.abbrev}-${g.away.abbrev}`);
      continue;
    }
    rows.push(r.game);
    jobs.push(r.job);
  }
  // A club from below (the relegation round) may not be in the team table yet.
  const known = new Set((await sql<{ id: string }>("select id from team where id = any($1)", [rows.flatMap((r) => [r.home_team_id, r.away_team_id])])).map((t) => t.id));
  const newTeams = new Map<string, Record<string, unknown>>();
  for (const g of missing) {
    const c = clubs.get(g.id);
    for (const [club, t] of [[c?.home, g.home], [c?.away, g.away]] as const) {
      if (!club || known.has(`hcz-${club}`)) continue;
      newTeams.set(`hcz-${club}`, {
        id: `hcz-${club}`,
        league_id: "cz-maxa",
        name: t.name,
        short_name: t.shortName || t.name,
        abbrev: t.abbrev,
        logo_url: t.logoUrl,
        external: { hokejczClubId: club },
      });
    }
  }
  const db = supabaseAdmin();
  if (newTeams.size) {
    const { error } = await db.from("team").upsert([...newTeams.values()], { onConflict: "id", ignoreDuplicates: true });
    if (error) throw new Error(`team: ${error.message}`);
  }
  if (rows.length) {
    const { error } = await db.from("game").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw new Error(`game: ${error.message}`);
    await enqueue(jobs);
  }
  return { dates: dates.length, added: rows.length, unmatched };
}
