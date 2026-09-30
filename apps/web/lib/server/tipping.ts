import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { addDays, modelTip, nhlGamecenterUrls, parseNhlRightRail, pragueDate, type Game } from "@hokejhub/core";
import { sql } from "./db";
import { fetchJson } from "./fetcher";
import { nhlPrediction } from "./game";
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
  odds: Game["preOdds"];
}

async function modelFor(g: Game, pred?: { expHome?: number; expAway?: number }) {
  if (pred?.expHome && pred.expAway) return modelTip(pred.expHome, pred.expAway);
  if (g.leagueKey === "nhl" && g.external.nhlId) {
    const rail = await fetchJson(nhlGamecenterUrls.rightRail(g.external.nhlId), parseNhlRightRail, { revalidate: 3600, notFoundIsEmpty: true });
    const p = nhlPrediction(rail.data);
    if (p) return modelTip(p.expHome, p.expAway);
  }
  return null;
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
  return sql<{ game_id: string; home: number; away: number }>("select game_id, home, away from tip where user_id = $1", [userId]);
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

export interface LeaderRow {
  user_id: string;
  nickname: string;
  club_logo: string | null;
  points: number;
  tips: number;
  exact: number;
  winners: number;
  last7: number;
}

export async function leaderboard(groupId: string | null): Promise<{ rows: LeaderRow[]; model: { points: number; tips: number; exact: number } }> {
  const rows = await sql<LeaderRow>(
    `select u.id as user_id, u.nickname, t.logo_url as club_logo,
            coalesce(sum(tip_points(p.home, p.away, g.home_score, g.away_score, g.decided_in)), 0)::int as points,
            count(g.settled_at)::int as tips,
            count(*) filter (where tip_points(p.home, p.away, g.home_score, g.away_score, g.decided_in) = 5)::int as exact,
            count(*) filter (where tip_points(p.home, p.away, g.home_score, g.away_score, g.decided_in) > 0)::int as winners,
            coalesce(sum(tip_points(p.home, p.away, g.home_score, g.away_score, g.decided_in)) filter (where g.start_at > now() - interval '7 days'), 0)::int as last7
     from tip_user u
     left join team t on t.id = u.club_id
     join tip p on p.user_id = u.id
     join tip_game g on g.game_id = p.game_id
     where ($1::uuid is null or u.id in (select user_id from tip_group_member where group_id = $1))
     group by u.id, u.nickname, t.logo_url
     order by points desc, exact desc, tips asc, u.nickname`,
    [groupId],
  );
  // The model plays every game anybody in the board tipped.
  const [model] = await sql<{ points: number; tips: number; exact: number }>(
    `select coalesce(sum(tip_points(g.model_home, g.model_away, g.home_score, g.away_score, g.decided_in)), 0)::int as points,
            count(g.settled_at) filter (where g.model_home is not null)::int as tips,
            count(*) filter (where tip_points(g.model_home, g.model_away, g.home_score, g.away_score, g.decided_in) = 5)::int as exact
     from tip_game g
     where g.game_id in (select p.game_id from tip p
                         where $1::uuid is null or p.user_id in (select user_id from tip_group_member where group_id = $1))`,
    [groupId],
  );
  return { rows, model: model ?? { points: 0, tips: 0, exact: 0 } };
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
  }>(
    `select g.game_id, g.league_key, to_char(g.play_date, 'YYYY-MM-DD') as play_date, g.start_at, g.home_name, g.away_name,
            g.home_logo, g.away_logo, p.home, p.away, g.model_home, g.model_away, g.home_score, g.away_score, g.decided_in,
            tip_points(p.home, p.away, g.home_score, g.away_score, g.decided_in) as points,
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
