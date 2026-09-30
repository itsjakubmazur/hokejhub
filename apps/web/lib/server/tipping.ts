import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import {
  addDays,
  buildPlayoffBracket,
  computeStandings,
  gameTips,
  modelTip,
  nhlGamecenterUrls,
  nhlUrls,
  parseNhlRightRail,
  pragueDate,
  rulesForSeason,
  type Game,
} from "@hokejhub/core";
import { sql } from "./db";
import { fetchJson } from "./fetcher";
import { nhlPrediction } from "./game";
import { getLeagueSeasons, getSeasonGames, toResultGames } from "./queries";
import { getScoreboard } from "./scoreboard";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const COOKIE = "hh_tip";
const SESSION_DAYS = 180;
export const TIP_LEAGUES = ["cz-elh", "nhl"] as const;

// ---------- accounts & sessions ----------

async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 32);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

async function verifyPassword(pw: string, stored: string) {
  const [, salt, key] = stored.split("$");
  if (!salt || !key) return false;
  const got = await scrypt(pw, Buffer.from(salt, "base64url"), 32);
  const want = Buffer.from(key, "base64url");
  return got.length === want.length && timingSafeEqual(got, want);
}

const tokenHash = (t: string) => createHash("sha256").update(t).digest("hex");

async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await sql("insert into tip_session (token_hash, user_id, expires_at) values ($1, $2, $3)", [tokenHash(token), userId, expires]);
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", expires });
}

export interface TipUser {
  id: string;
  nickname: string;
  club_id: string | null;
  club_logo: string | null;
  club_name: string | null;
}

export async function currentUser(): Promise<TipUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [u] = await sql<TipUser>(
    `select u.id, u.nickname, u.club_id, t.logo_url as club_logo, t.short_name as club_name
     from tip_session s join tip_user u on u.id = s.user_id left join team t on t.id = u.club_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [tokenHash(token)],
  );
  return u ?? null;
}

export class TipError extends Error {}

const NICK = /^[\p{L}\p{N}_.\- ]{3,24}$/u;

export async function register(nickname: string, password: string, clubId: string | null) {
  const nick = nickname.trim();
  if (!NICK.test(nick)) throw new TipError("Přezdívka musí mít 3–24 znaků (písmena, čísla, mezera, tečka, pomlčka).");
  if (password.length < 6) throw new TipError("Heslo musí mít aspoň 6 znaků.");
  const [taken] = await sql("select 1 from tip_user where nickname_key = lower($1)", [nick]);
  if (taken) throw new TipError("Tahle přezdívka už je obsazená.");
  const club = clubId ? (await sql<{ id: string }>("select id from team where id = $1", [clubId]))[0]?.id ?? null : null;
  const [u] = await sql<{ id: string }>("insert into tip_user (nickname, pass_hash, club_id) values ($1, $2, $3) returning id", [nick, await hashPassword(password), club]);
  await startSession(u!.id);
}

export async function login(nickname: string, password: string) {
  const [u] = await sql<{ id: string; pass_hash: string; failed_logins: number; locked_until: string | null }>(
    "select id, pass_hash, failed_logins, locked_until from tip_user where nickname_key = lower($1)",
    [nickname.trim()],
  );
  if (u?.locked_until && new Date(u.locked_until) > new Date()) throw new TipError("Příliš mnoho pokusů. Zkus to za 15 minut.");
  if (!u || !(await verifyPassword(password, u.pass_hash))) {
    if (u) {
      await sql(
        `update tip_user set failed_logins = failed_logins + 1,
           locked_until = case when failed_logins + 1 >= 8 then now() + interval '15 minutes' else null end where id = $1`,
        [u.id],
      );
    }
    throw new TipError("Špatná přezdívka nebo heslo.");
  }
  await sql("update tip_user set failed_logins = 0, locked_until = null where id = $1", [u.id]);
  await startSession(u.id);
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await sql("delete from tip_session where token_hash = $1", [tokenHash(token)]);
  jar.delete(COOKIE);
}

// ---------- games to tip ----------

export interface TipGame {
  id: string;
  league: string;
  leagueName: string;
  playDate: string;
  startAt: string;
  status: Game["status"];
  home: { name: string; logo: string | null };
  away: { name: string; logo: string | null };
  model: { home: number; away: number } | null;
  /** The model's few confident side markets (handicap, goals, first goal). */
  tips: { label: string; p: number; side: "home" | "away" | "none" }[];
  odds: Game["preOdds"];
}

async function expectedFor(g: Game, pred?: { expHome?: number; expAway?: number }) {
  if (pred?.expHome && pred.expAway) return { expHome: pred.expHome, expAway: pred.expAway };
  if (g.leagueKey === "nhl" && g.external.nhlId) {
    const rail = await fetchJson(nhlGamecenterUrls.rightRail(g.external.nhlId), parseNhlRightRail, { revalidate: 3600, notFoundIsEmpty: true });
    const p = nhlPrediction(rail.data);
    if (p) return { expHome: p.expHome, expAway: p.expAway };
  }
  return null;
}

async function modelFor(g: Game, pred?: { expHome?: number; expAway?: number }) {
  const e = await expectedFor(g, pred);
  return e ? modelTip(e.expHome, e.expAway) : null;
}

async function tipsFor(g: Game, pred?: { expHome?: number; expAway?: number }) {
  const e = await expectedFor(g, pred);
  if (!e) return [];
  return gameTips(e.expHome, e.expAway, g.home.shortName, g.away.shortName).map((m) => ({ label: m.label, p: m.p, side: m.side }));
}

/** Tippable games: extraliga and NHL, today and the next `days` days. */
export async function upcomingGames(days = 7): Promise<TipGame[]> {
  const today = pragueDate();
  const dates = Array.from({ length: days }, (_, i) => addDays(today, i));
  const boards = await Promise.all(dates.map((d) => getScoreboard(d).catch(() => null)));
  const out: TipGame[] = [];
  const seen = new Set<string>();
  await Promise.all(
    boards.flatMap((b, i) =>
      (b?.games ?? [])
        .filter((g) => (TIP_LEAGUES as readonly string[]).includes(g.leagueKey) && g.status === "scheduled" && Date.parse(g.startAt) > Date.now())
        .map(async (g) => {
          if (seen.has(g.id)) return;
          seen.add(g.id);
          out.push({
            id: g.id,
            league: g.leagueKey,
            leagueName: g.leagueName,
            playDate: dates[i]!,
            startAt: g.startAt,
            status: g.status,
            home: { name: g.home.shortName, logo: g.home.logoUrl },
            away: { name: g.away.shortName, logo: g.away.logoUrl },
            model: await modelFor(g, b?.predictions?.[g.id]).catch(() => null),
            tips: await tipsFor(g, b?.predictions?.[g.id]).catch(() => []),
            odds: g.preOdds,
          });
        }),
    ),
  );
  return out.sort((a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id));
}

/** Save a tip; the game is re-read from the feed so kick-off time cannot be spoofed. */
export async function saveTip(userId: string, gameId: string, playDate: string, home: number, away: number) {
  if (![home, away].every((v) => Number.isInteger(v) && v >= 0 && v <= 20)) throw new TipError("Neplatné skóre.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(playDate)) throw new TipError("Neplatné datum.");
  const board = await getScoreboard(playDate);
  const g = board.games.find((x) => x.id === gameId);
  if (!g || !(TIP_LEAGUES as readonly string[]).includes(g.leagueKey)) throw new TipError("Zápas nenalezen.");
  if (g.status !== "scheduled" || Date.parse(g.startAt) <= Date.now()) throw new TipError("Zápas už začal, tip je uzamčený.");
  const model = await modelFor(g, board.predictions?.[g.id]).catch(() => null);
  await sql(
    `insert into tip_game (game_id, league_key, play_date, start_at, home_name, away_name, home_logo, away_logo, model_home, model_away)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     on conflict (game_id) do update set start_at = excluded.start_at,
       model_home = coalesce(tip_game.model_home, excluded.model_home), model_away = coalesce(tip_game.model_away, excluded.model_away)`,
    [g.id, g.leagueKey, playDate, g.startAt, g.home.shortName, g.away.shortName, g.home.logoUrl, g.away.logoUrl, model?.home ?? null, model?.away ?? null],
  );
  await sql(
    `insert into tip (user_id, game_id, home, away) values ($1, $2, $3, $4)
     on conflict (user_id, game_id) do update set home = excluded.home, away = excluded.away, updated_at = now()`,
    [userId, gameId, home, away],
  );
}

export async function myTips(userId: string) {
  return sql<{ game_id: string; home: number; away: number; joker: boolean }>("select game_id, home, away, joker from tip where user_id = $1", [userId]);
}

/**
 * Joker: double points on one game per match day. Moving it is allowed until the game holding it
 * starts; after that the day's joker is spent.
 */
export async function setJoker(userId: string, gameId: string, on: boolean) {
  const [t] = await sql<{ play_date: string; started: boolean }>(
    `select to_char(g.play_date, 'YYYY-MM-DD') as play_date, g.start_at <= now() as started
     from tip p join tip_game g on g.game_id = p.game_id where p.user_id = $1 and p.game_id = $2`,
    [userId, gameId],
  );
  if (!t) throw new TipError("Nejdřív zápas otipuj.");
  if (t.started) throw new TipError("Zápas už začal, žolíka nejde změnit.");
  if (on) {
    const [spent] = await sql(
      `select 1 from tip p join tip_game g on g.game_id = p.game_id
       where p.user_id = $1 and p.joker and g.play_date = $2 and g.start_at <= now()`,
      [userId, t.play_date],
    );
    if (spent) throw new TipError("Žolíka na tenhle den už máš v zápase, který začal.");
    await sql(
      `update tip p set joker = false from tip_game g
       where g.game_id = p.game_id and p.user_id = $1 and g.play_date = $2 and p.game_id <> $3`,
      [userId, t.play_date, gameId],
    );
  }
  await sql("update tip set joker = $3, updated_at = now() where user_id = $1 and game_id = $2", [userId, gameId, on]);
}

// ---------- settlement ----------

/** Fill in final scores for tipped games that should be over (≈ 3 h after face-off). */
export async function settle() {
  const due = await sql<{ play_date: string }>(
    `select distinct to_char(play_date, 'YYYY-MM-DD') as play_date from tip_game
     where settled_at is null and start_at < now() - interval '150 minutes' limit 10`,
  );
  for (const { play_date } of due) {
    const board = await getScoreboard(play_date).catch(() => null);
    for (const g of board?.games ?? []) {
      if (g.status === "final" && g.homeScore !== null && g.awayScore !== null) {
        await sql(
          `update tip_game set home_score = $2, away_score = $3, decided_in = $4, settled_at = now()
           where game_id = $1 and settled_at is null`,
          [g.id, g.homeScore, g.awayScore, g.decidedIn],
        );
      } else if (g.status === "postponed" || g.status === "cancelled") {
        await sql("delete from tip_game where game_id = $1 and settled_at is null", [g.id]);
      }
    }
  }
}

// ---------- leaderboards, history, groups ----------

export type Period = "all" | "30" | "7" | "day";

export interface LeaderRow {
  user_id: string;
  nickname: string;
  club_logo: string | null;
  points: number;
  bonus: number;
  tips: number;
  exact: number;
  winners: number;
  jokers: number;
}

const PERIOD_SQL = `(
  $2::text = 'all'
  or ($2 = '30' and g.start_at > now() - interval '30 days')
  or ($2 = '7' and g.start_at > now() - interval '7 days')
  or ($2 = 'day' and g.play_date = $3::date)
)`;

/**
 * Standings for everybody or one group over a period. Ties: exact scores, then correct winners,
 * then fewer tips (efficiency). Season bonus questions count in the overall table only.
 */
export async function leaderboard(
  groupId: string | null,
  period: Period = "all",
  day: string | null = null,
): Promise<{ rows: LeaderRow[]; model: { points: number; tips: number; exact: number } }> {
  const rows = await sql<LeaderRow>(
    `with scored as (
       select p.user_id, g.settled_at, p.joker,
              tip_score(p.home, p.away, g.home_score, g.away_score, g.decided_in, p.joker) as pts,
              tip_points(p.home, p.away, g.home_score, g.away_score, g.decided_in) as base
       from tip p join tip_game g on g.game_id = p.game_id
       where ${PERIOD_SQL}
     ),
     bonus as (
       select a.user_id, sum(q.points)::int as pts
       from tip_bonus_answer a join tip_bonus_question q on q.id = a.question_id
       where $2 = 'all' and q.answer is not null and q.answer = a.value
       group by a.user_id
     )
     select u.id as user_id, u.nickname, t.logo_url as club_logo,
            (coalesce(sum(s.pts), 0) + coalesce(max(b.pts), 0))::int as points,
            coalesce(max(b.pts), 0)::int as bonus,
            count(s.settled_at)::int as tips,
            count(*) filter (where s.base = 5)::int as exact,
            count(*) filter (where s.base > 0)::int as winners,
            count(*) filter (where s.joker and s.settled_at is not null)::int as jokers
     from tip_user u
     left join team t on t.id = u.club_id
     left join scored s on s.user_id = u.id
     left join bonus b on b.user_id = u.id
     where (s.user_id is not null or b.user_id is not null)
       and ($1::uuid is null or u.id in (select user_id from tip_group_member where group_id = $1))
     group by u.id, u.nickname, t.logo_url
     order by points desc, exact desc, winners desc, tips asc, u.nickname`,
    [groupId, period, day],
  );
  // The model plays every game anybody in the board tipped (no joker, no bonus questions).
  const [model] = await sql<{ points: number; tips: number; exact: number }>(
    `select coalesce(sum(tip_points(g.model_home, g.model_away, g.home_score, g.away_score, g.decided_in)), 0)::int as points,
            count(g.settled_at) filter (where g.model_home is not null)::int as tips,
            count(*) filter (where tip_points(g.model_home, g.model_away, g.home_score, g.away_score, g.decided_in) = 5)::int as exact
     from tip_game g
     where ${PERIOD_SQL}
       and g.game_id in (select p.game_id from tip p
                         where $1::uuid is null or p.user_id in (select user_id from tip_group_member where group_id = $1))`,
    [groupId, period, day],
  );
  return { rows, model: model ?? { points: 0, tips: 0, exact: 0 } };
}

/** Best tipster of each of the last settled match days ("tipér dne"). */
export async function dayWinners(groupId: string | null) {
  return sql<{ play_date: string; nickname: string; club_logo: string | null; points: number }>(
    `with d as (
       select g.play_date, p.user_id, sum(tip_score(p.home, p.away, g.home_score, g.away_score, g.decided_in, p.joker))::int as points
       from tip p join tip_game g on g.game_id = p.game_id
       where g.settled_at is not null and g.play_date > current_date - 14
         and ($1::uuid is null or p.user_id in (select user_id from tip_group_member where group_id = $1))
       group by g.play_date, p.user_id
     ), r as (
       select d.*, rank() over (partition by play_date order by points desc) as rk from d where points > 0
     )
     select to_char(r.play_date, 'YYYY-MM-DD') as play_date, u.nickname, t.logo_url as club_logo, r.points
     from r join tip_user u on u.id = r.user_id left join team t on t.id = u.club_id
     where r.rk = 1 order by r.play_date desc, u.nickname limit 10`,
    [groupId],
  );
}

/**
 * What everybody tipped on a game. The 1/X/2 split is always public; the individual tips (of
 * the group, or everybody) only once the game has started so nobody can copy them.
 */
export async function crowd(gameId: string, groupId: string | null) {
  const [agg] = await sql<{ n: number; home: number; draw: number; away: number; started: boolean }>(
    `select count(*)::int as n,
            count(*) filter (where p.home > p.away)::int as home,
            count(*) filter (where p.home = p.away)::int as draw,
            count(*) filter (where p.home < p.away)::int as away,
            bool_or(g.start_at <= now()) as started
     from tip p join tip_game g on g.game_id = p.game_id where p.game_id = $1`,
    [gameId],
  );
  const scores = await sql<{ score: string; n: number }>(
    `select p.home || ':' || p.away as score, count(*)::int as n from tip p where p.game_id = $1
     group by 1 order by 2 desc, 1 limit 5`,
    [gameId],
  );
  const tips = agg?.started
    ? await sql<{ nickname: string; club_logo: string | null; home: number; away: number; joker: boolean; points: number | null }>(
        `select u.nickname, t.logo_url as club_logo, p.home, p.away, p.joker,
                tip_score(p.home, p.away, g.home_score, g.away_score, g.decided_in, p.joker) as points
         from tip p join tip_game g on g.game_id = p.game_id join tip_user u on u.id = p.user_id left join team t on t.id = u.club_id
         where p.game_id = $1 and ($2::uuid is null or p.user_id in (select user_id from tip_group_member where group_id = $2))
         order by points desc nulls last, u.nickname limit 100`,
        [gameId, groupId],
      )
    : [];
  return { n: agg?.n ?? 0, split: { home: agg?.home ?? 0, draw: agg?.draw ?? 0, away: agg?.away ?? 0 }, scores, tips, started: Boolean(agg?.started) };
}

/** 1/X/2 split of all tips for many games at once (tipping screen). */
export async function crowdSplits(ids: string[]) {
  if (ids.length === 0) return {};
  const rows = await sql<{ game_id: string; n: number; home: number; draw: number; away: number }>(
    `select game_id, count(*)::int as n, count(*) filter (where home > away)::int as home,
            count(*) filter (where home = away)::int as draw, count(*) filter (where home < away)::int as away
     from tip where game_id = any($1) group by game_id`,
    [ids],
  );
  return Object.fromEntries(rows.map((r) => [r.game_id, { n: r.n, home: r.home, draw: r.draw, away: r.away }]));
}

// ---------- personal stats & badges ----------

export interface Badge {
  id: string;
  title: string;
  text: string;
  earned: boolean;
}

export async function stats(userId: string) {
  const rows = await sql<{ play_date: string; base: number; pts: number; model: number | null; joker: boolean }>(
    `select to_char(g.play_date, 'YYYY-MM-DD') as play_date,
            tip_points(p.home, p.away, g.home_score, g.away_score, g.decided_in) as base,
            tip_score(p.home, p.away, g.home_score, g.away_score, g.decided_in, p.joker) as pts,
            tip_points(g.model_home, g.model_away, g.home_score, g.away_score, g.decided_in) as model, p.joker
     from tip p join tip_game g on g.game_id = p.game_id
     where p.user_id = $1 and g.settled_at is not null order by g.start_at`,
    [userId],
  );
  let streak = 0;
  let best = 0;
  const byDay = new Map<string, number>();
  for (const r of rows) {
    streak = r.base > 0 ? streak + 1 : 0;
    best = Math.max(best, streak);
    byDay.set(r.play_date, (byDay.get(r.play_date) ?? 0) + r.pts);
  }
  const exact = rows.filter((r) => r.base === 5).length;
  const hits = rows.filter((r) => r.base > 0).length;
  const points = rows.reduce((s, r) => s + r.pts, 0);
  const model = rows.reduce((s, r) => s + (r.model ?? 0), 0);
  const jokerHits = rows.filter((r) => r.joker && r.base > 0).length;
  const bestDay = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const [dayWins] = await sql<{ n: number }>(
    `with d as (
       select g.play_date, p.user_id, sum(tip_score(p.home, p.away, g.home_score, g.away_score, g.decided_in, p.joker)) as pts
       from tip p join tip_game g on g.game_id = p.game_id where g.settled_at is not null group by 1, 2
     ), r as (select d.*, rank() over (partition by play_date order by pts desc) as rk from d where pts > 0)
     select count(*)::int as n from r where user_id = $1 and rk = 1`,
    [userId],
  );
  const badges: Badge[] = [
    { id: "first-exact", title: "Do černého", text: "první přesně trefený výsledek", earned: exact >= 1 },
    { id: "sniper", title: "Ostrostřelec", text: "10 přesných výsledků", earned: exact >= 10 },
    { id: "streak5", title: "Série", text: "5 bodovaných tipů v řadě", earned: best >= 5 },
    { id: "streak10", title: "Hattrick sérií", text: "10 bodovaných tipů v řadě", earned: best >= 10 },
    { id: "machine", title: "Porazil stroj", text: "víc bodů než model (min. 20 tipů)", earned: rows.length >= 20 && points > model },
    { id: "joker", title: "Žolík", text: "bodovaný tip se žolíkem", earned: jokerHits >= 1 },
    { id: "day", title: "Tipér dne", text: "nejlepší ze všech za jeden den", earned: (dayWins?.n ?? 0) >= 1 },
    { id: "loyal", title: "Permanentka", text: "100 vyhodnocených tipů", earned: rows.length >= 100 },
  ];
  return {
    tips: rows.length,
    points,
    model,
    exact,
    accuracy: rows.length ? hits / rows.length : null,
    streak,
    bestStreak: best,
    bestDay: bestDay ? { date: bestDay[0], points: bestDay[1] } : null,
    dayWins: dayWins?.n ?? 0,
    badges,
  };
}

export async function history(userId: string) {
  return sql<{
    game_id: string;
    league_key: string;
    play_date: string;
    start_at: string;
    home_name: string;
    away_name: string;
    home_logo: string | null;
    away_logo: string | null;
    home: number;
    away: number;
    model_home: number | null;
    model_away: number | null;
    home_score: number | null;
    away_score: number | null;
    decided_in: string | null;
    points: number | null;
    model_points: number | null;
    joker: boolean;
  }>(
    `select g.game_id, g.league_key, to_char(g.play_date, 'YYYY-MM-DD') as play_date, g.start_at, g.home_name, g.away_name,
            g.home_logo, g.away_logo, p.home, p.away, g.model_home, g.model_away, g.home_score, g.away_score, g.decided_in,
            tip_score(p.home, p.away, g.home_score, g.away_score, g.decided_in, p.joker) as points, p.joker,
            tip_points(g.model_home, g.model_away, g.home_score, g.away_score, g.decided_in) as model_points
     from tip p join tip_game g on g.game_id = p.game_id
     where p.user_id = $1 order by g.start_at desc limit 200`,
    [userId],
  );
}

export async function myGroups(userId: string) {
  return sql<{ id: string; name: string; code: string; members: number; owner: boolean }>(
    `select g.id, g.name, g.code, (select count(*) from tip_group_member m2 where m2.group_id = g.id)::int as members, g.owner_id = $1 as owner
     from tip_group g join tip_group_member m on m.group_id = g.id and m.user_id = $1 order by g.created_at`,
    [userId],
  );
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function createGroup(userId: string, name: string) {
  const n = name.trim();
  if (n.length < 2 || n.length > 40) throw new TipError("Název skupiny musí mít 2–40 znaků.");
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Array.from(randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
    const rows = await sql<{ id: string }>(
      "insert into tip_group (name, code, owner_id) values ($1, $2, $3) on conflict (code) do nothing returning id",
      [n, code, userId],
    );
    if (rows[0]) {
      await sql("insert into tip_group_member (group_id, user_id) values ($1, $2)", [rows[0].id, userId]);
      return code;
    }
  }
  throw new TipError("Nepodařilo se vytvořit skupinu, zkus to znovu.");
}

export async function joinGroup(userId: string, code: string) {
  const [g] = await sql<{ id: string; name: string }>("select id, name from tip_group where code = upper($1)", [code.trim()]);
  if (!g) throw new TipError("Skupina s tímhle kódem neexistuje.");
  await sql("insert into tip_group_member (group_id, user_id) values ($1, $2) on conflict do nothing", [g.id, userId]);
  return g.name;
}

// ---------- group wall ----------

async function member(userId: string, groupId: string) {
  const [m] = await sql("select 1 from tip_group_member where group_id = $1 and user_id = $2", [groupId, userId]);
  if (!m) throw new TipError("Do této skupiny nepatříš.");
}

export async function messages(userId: string, groupId: string) {
  await member(userId, groupId);
  return sql<{ id: number; nickname: string; club_logo: string | null; body: string; created_at: string; mine: boolean }>(
    `select m.id::int, u.nickname, t.logo_url as club_logo, m.body, m.created_at, m.user_id = $2 as mine
     from tip_group_message m join tip_user u on u.id = m.user_id left join team t on t.id = u.club_id
     where m.group_id = $1 order by m.id desc limit 60`,
    [groupId, userId],
  );
}

export async function postMessage(userId: string, groupId: string, body: string) {
  await member(userId, groupId);
  const text = body.trim().replace(/\s+/g, " ");
  if (!text || text.length > 500) throw new TipError("Zpráva musí mít 1–500 znaků.");
  const [recent] = await sql(
    "select 1 from tip_group_message where user_id = $1 and created_at > now() - interval '3 seconds'",
    [userId],
  );
  if (recent) throw new TipError("Pomaleji, trenér ti dává trest za zdržování hry.");
  await sql("insert into tip_group_message (group_id, user_id, body) values ($1, $2, $3)", [groupId, userId, text]);
}

// ---------- season bonus questions ----------

interface BonusOption {
  id: string;
  name: string;
  logo: string | null;
}

async function elhTeams(season: number): Promise<BonusOption[]> {
  for (const s of [season, season - 1]) {
    const rows = await sql<BonusOption>(
      `select distinct t.id, coalesce(t.short_name, t.name) as name, t.logo_url as logo
       from game g join team t on t.id = g.home_team_id
       where g.league_id = 'cz-elh' and g.season = $1 and g.phase = 'regular' order by 2`,
      [s],
    );
    if (rows.length >= 10) return rows;
  }
  return [];
}

async function nhlTeams(): Promise<BonusOption[]> {
  const res = await fetchJson(
    nhlUrls.standings("now"),
    (j) =>
      ((j as { standings?: { teamAbbrev: { default: string }; teamName: { default: string }; teamLogo: string }[] }).standings ?? []).map((t) => ({
        id: `nhl-${t.teamAbbrev.default}`,
        name: t.teamName.default,
        logo: t.teamLogo,
      })),
    { revalidate: 86400 },
  );
  return (res.data ?? []).sort((a, b) => a.name.localeCompare(b.name, "cs"));
}

/** Creates this season's questions once (options from the season's teams). */
async function ensureBonusQuestions() {
  const [elhSeason] = await getLeagueSeasons("cz-elh");
  const season = elhSeason?.season;
  if (!season) return;
  const [have] = await sql<{ n: number }>("select count(*)::int as n from tip_bonus_question where season = $1", [season]);
  if ((have?.n ?? 0) >= 4) return;
  const [elh, nhl] = await Promise.all([elhTeams(season), nhlTeams().catch(() => [])]);
  const cet = (d: string) => `${d}T23:59:00+01:00`;
  const qs = [
    { id: `cz-elh-${season}-champion`, league: "cz-elh", title: "Mistr extraligy", options: elh, points: 15, locks: cet(`${season + 1}-02-28`), sort: 1 },
    { id: `cz-elh-${season}-regular`, league: "cz-elh", title: "Vítěz základní části", options: elh, points: 10, locks: cet(`${season}-10-31`), sort: 2 },
    { id: `cz-elh-${season}-last`, league: "cz-elh", title: "Poslední po základní části", options: elh, points: 8, locks: cet(`${season}-10-31`), sort: 3 },
    { id: `nhl-${season}-cup`, league: "nhl", title: "Vítěz Stanley Cupu", options: nhl, points: 12, locks: cet(`${season}-10-20`), sort: 4 },
  ];
  for (const q of qs) {
    if (q.options.length < 2) continue;
    await sql(
      `insert into tip_bonus_question (id, league_key, season, title, options, points, locks_at, sort)
       values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (id) do nothing`,
      [q.id, q.league, season, q.title, JSON.stringify(q.options), q.points, q.locks, q.sort],
    );
  }
}

/** Settles extraliga questions from our own data once the regular season / final is over. */
async function settleBonus() {
  const open = await sql<{ id: string; season: number }>(
    "select id, season from tip_bonus_question where answer is null and league_key = 'cz-elh' and locks_at < now()",
  );
  for (const q of open) {
    const [regular, playoff] = await Promise.all([getSeasonGames("cz-elh", q.season, "regular"), getSeasonGames("cz-elh", q.season, "playoff")]);
    const po = toResultGames(playoff);
    if (po.length === 0) continue; // regular season still running
    let answer: string | null = null;
    if (q.id.endsWith("-regular") || q.id.endsWith("-last")) {
      const table = computeStandings(toResultGames(regular), { rules: rulesForSeason(q.season) });
      answer = (q.id.endsWith("-regular") ? table[0] : table.at(-1))?.teamId ?? null;
    } else if (q.id.endsWith("-champion")) {
      const games = playoff.flatMap((g) => {
        const r = toResultGames([g])[0];
        return r ? [{ ...r, round: g.round }] : [];
      });
      const stages = buildPlayoffBracket(games, new Map(), { Finále: 4 });
      answer = stages.find((s) => s.name === "Finále")?.series[0]?.winner ?? null;
    }
    if (answer) await sql("update tip_bonus_question set answer = $2, settled_at = now() where id = $1 and answer is null", [q.id, answer]);
  }
}

export async function bonusQuestions(userId: string | null) {
  await ensureBonusQuestions().catch((e) => console.error("[tip] bonus seed", e));
  await settleBonus().catch((e) => console.error("[tip] bonus settle", e));
  return sql<{
    id: string;
    league_key: string;
    title: string;
    options: BonusOption[];
    points: number;
    locks_at: string;
    locked: boolean;
    answer: string | null;
    mine: string | null;
    picks: Record<string, number> | null;
  }>(
    `select q.id, q.league_key, q.title, q.options, q.points, q.locks_at, q.locks_at <= now() as locked, q.answer,
            (select a.value from tip_bonus_answer a where a.question_id = q.id and a.user_id = $1) as mine,
            (select jsonb_object_agg(value, n) from (select value, count(*)::int as n from tip_bonus_answer a
               where a.question_id = q.id group by value) x) as picks
     from tip_bonus_question q
     where q.season = (select max(season) from tip_bonus_question)
     order by q.sort`,
    [userId],
  );
}

export async function saveBonus(userId: string, questionId: string, value: string) {
  const [q] = await sql<{ locked: boolean; options: BonusOption[] }>(
    "select locks_at <= now() as locked, options from tip_bonus_question where id = $1",
    [questionId],
  );
  if (!q) throw new TipError("Otázka nenalezena.");
  if (q.locked) throw new TipError("Tahle otázka je už uzamčená.");
  if (!q.options.some((o) => o.id === value)) throw new TipError("Neplatná volba.");
  await sql(
    `insert into tip_bonus_answer (user_id, question_id, value) values ($1, $2, $3)
     on conflict (user_id, question_id) do update set value = excluded.value, updated_at = now()`,
    [userId, questionId, value],
  );
}

/** Admin: set the answer of a question our data cannot settle (e.g. the Stanley Cup). */
export async function setBonusAnswer(questionId: string, answer: string) {
  await sql("update tip_bonus_question set answer = $2, settled_at = now() where id = $1", [questionId, answer]);
}
