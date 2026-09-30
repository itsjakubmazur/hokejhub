import {
  createGroup,
  currentUser,
  history,
  joinGroup,
  leaderboard,
  login,
  logout,
  myGroups,
  myTips,
  register,
  saveTip,
  settle,
  TipError,
  upcomingGames,
} from "@/lib/server/tipping";

/**
 * Tipping league API.
 *   GET  me | games | leaderboard?group= | history | groups
 *   POST register | login | logout | tip | tips (bulk import) | group | join
 */
export const dynamic = "force-dynamic";

const ok = (data: unknown) => Response.json(data, { headers: { "cache-control": "no-store" } });
const fail = (msg: string, status = 400) => Response.json({ error: msg }, { status });

async function body<T>(req: Request): Promise<Partial<T>> {
  return ((await req.json().catch(() => ({}))) ?? {}) as Partial<T>;
}

export async function GET(req: Request, ctx: RouteContext<"/api/tip/[action]">) {
  const { action } = await ctx.params;
  const user = await currentUser();
  try {
    switch (action) {
      case "me":
        return ok({ user });
      case "games": {
        const [games, tips] = await Promise.all([upcomingGames(7), user ? myTips(user.id) : []]);
        return ok({ games, tips: Object.fromEntries(tips.map((t) => [t.game_id, { home: t.home, away: t.away }])) });
      }
      case "leaderboard": {
        await settle().catch((e) => console.error("[tip] settle", e));
        const group = new URL(req.url).searchParams.get("group");
        if (group && (!user || !(await myGroups(user.id)).some((g) => g.id === group))) return fail("Do této skupiny nepatříš.", 403);
        return ok(await leaderboard(group || null));
      }
      case "history":
        if (!user) return fail("Nejsi přihlášený.", 401);
        await settle().catch((e) => console.error("[tip] settle", e));
        return ok({ history: await history(user.id) });
      case "groups":
        if (!user) return fail("Nejsi přihlášený.", 401);
        return ok({ groups: await myGroups(user.id) });
    }
    return fail("Neznámá akce.", 404);
  } catch (e) {
    console.error("[tip]", e);
    return fail("Něco se pokazilo, zkus to znovu.", 500);
  }
}

export async function POST(req: Request, ctx: RouteContext<"/api/tip/[action]">) {
  const { action } = await ctx.params;
  try {
    if (action === "register") {
      const b = await body<{ nickname: string; password: string; clubId: string }>(req);
      await register(String(b.nickname ?? ""), String(b.password ?? ""), b.clubId ? String(b.clubId) : null);
      return ok({ user: await currentUser() });
    }
    if (action === "login") {
      const b = await body<{ nickname: string; password: string }>(req);
      await login(String(b.nickname ?? ""), String(b.password ?? ""));
      return ok({ user: await currentUser() });
    }
    if (action === "logout") {
      await logout();
      return ok({ user: null });
    }
    const user = await currentUser();
    if (!user) return fail("Nejsi přihlášený.", 401);
    switch (action) {
      case "tip": {
        const b = await body<{ gameId: string; playDate: string; home: number; away: number }>(req);
        await saveTip(user.id, String(b.gameId), String(b.playDate), Number(b.home), Number(b.away));
        return ok({ saved: true });
      }
      case "tips": {
        // One-off import of tips kept in this browser before accounts existed.
        const b = await body<{ tips: { gameId: string; playDate: string; home: number; away: number }[] }>(req);
        let saved = 0;
        for (const t of (b.tips ?? []).slice(0, 100)) {
          try {
            await saveTip(user.id, String(t.gameId), String(t.playDate), Number(t.home), Number(t.away));
            saved++;
          } catch {
            /* started games stay behind */
          }
        }
        return ok({ saved });
      }
      case "group": {
        const b = await body<{ name: string }>(req);
        return ok({ code: await createGroup(user.id, String(b.name ?? "")) });
      }
      case "join": {
        const b = await body<{ code: string }>(req);
        return ok({ name: await joinGroup(user.id, String(b.code ?? "")) });
      }
    }
    return fail("Neznámá akce.", 404);
  } catch (e) {
    if (e instanceof TipError) return fail(e.message);
    console.error("[tip]", e);
    return fail("Něco se pokazilo, zkus to znovu.", 500);
  }
}
