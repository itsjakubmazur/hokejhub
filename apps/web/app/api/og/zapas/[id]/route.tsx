/* eslint-disable @next/next/no-img-element -- satori renders plain <img> */
import { ImageResponse } from "next/og";
import { getLeague } from "@hokejhub/core";
import { getGameDetail } from "@/lib/server/game";
import { nice } from "@/lib/names";

/** Share card for a game: 1200×630 PNG with logos, score, scorers and xG. */
export const revalidate = 120;

let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 800 }[]> | null = null;

/** Inter with Czech glyphs; without a browser UA Google Fonts serves TTF, which satori reads. */
function loadFonts() {
  fonts ??= Promise.all(
    ([400, 800] as const).map(async (weight) => {
      const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&subset=latin-ext`)).text();
      const urls = [...css.matchAll(/src: url\((.+?)\)/g)].map((m) => m[1]!);
      // The latin-ext block comes first; satori takes one file, so prefer the full (non-subset) file if present.
      const url = urls.at(-1)!;
      return { name: "Inter", data: await (await fetch(url)).arrayBuffer(), weight };
    }),
  ).catch((e) => {
    fonts = null;
    throw e;
  });
  return fonts;
}

export async function GET(req: Request, ctx: RouteContext<"/api/og/zapas/[id]">) {
  const { id } = await ctx.params;
  const d = new URL(req.url).searchParams.get("d") ?? undefined;
  const [detail, fontData] = await Promise.all([getGameDetail(id, d), loadFonts().catch(() => [])]);
  if (!detail) return new Response("not found", { status: 404 });
  const g = detail.game;
  const league = getLeague(g.leagueKey, g.leagueName);
  const started = g.homeScore !== null;
  const live = g.status === "live" || g.status === "intermission";
  const scorers = (side: "home" | "away") => {
    if (detail.box) {
      const abbrev = side === "home" ? detail.box.home.abbrev : detail.box.away.abbrev;
      return detail.box.goals.filter((x) => x.team === abbrev).map((x) => `${nice(x.scorer.name)} ${x.time}`);
    }
    return (detail.goals ?? []).filter((x) => x.teamAbbrev === (side === "home" ? g.home.abbrev : g.away.abbrev)).map((x) => `${x.scorer} ${x.time}`);
  };
  const shotXg = detail.shots?.length
    ? [
        detail.shots.filter((x) => x.teamId === g.home.id).reduce((a, x) => a + (x.xg ?? 0), 0),
        detail.shots.filter((x) => x.teamId !== g.home.id).reduce((a, x) => a + (x.xg ?? 0), 0),
      ]
    : null;
  const suffix = g.decidedIn === "OT" ? "PP" : g.decidedIn === "SO" ? "SN" : "";
  const when = new Date(g.startAt).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  const Team = ({ side }: { side: "home" | "away" }) => {
    const t = side === "home" ? g.home : g.away;
    const list = scorers(side).slice(0, 5);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 360 }}>
        <div style={{ display: "flex", width: 168, height: 168, borderRadius: 36, background: "white", alignItems: "center", justifyContent: "center" }}>
          {t.logoUrl ? <img src={t.logoUrl} width={136} height={136} style={{ objectFit: "contain" }} alt="" /> : <div style={{ fontSize: 56, fontWeight: 800, color: "#111" }}>{t.abbrev}</div>}
        </div>
        <div style={{ marginTop: 20, fontSize: 40, fontWeight: 800 }}>{t.shortName}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 10, fontSize: 22, color: "#9aa7b8" }}>
          {list.map((s, i) => (
            <div key={i}>{s}</div>
          ))}
        </div>
      </div>
    );
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "radial-gradient(circle at 15% 0%, #16324a 0%, #0b0f14 55%), #0b0f14",
          color: "#f2f5f8",
          fontFamily: "Inter",
          padding: "40px 56px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#9aa7b8" }}>
          <div style={{ display: "flex" }}>{league.name}</div>
          <div style={{ display: "flex" }}>{when}</div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "flex-start", justifyContent: "space-between", paddingTop: 56 }}>
          <Team side="home" />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 8 }}>
            {live ? (
              <div style={{ display: "flex", fontSize: 24, fontWeight: 800, color: "#ff4d5e", marginBottom: 8 }}>● ŽIVĚ {g.clock ?? ""}</div>
            ) : null}
            <div style={{ display: "flex", fontSize: 150, fontWeight: 800, letterSpacing: -4 }}>
              {started ? `${g.homeScore}:${g.awayScore}` : "vs"}
            </div>
            {suffix ? <div style={{ display: "flex", fontSize: 28, color: "#9aa7b8" }}>{suffix}</div> : null}
            {g.periods.length ? (
              <div style={{ display: "flex", fontSize: 24, color: "#9aa7b8", marginTop: 6 }}>({g.periods.map((p) => `${p[0]}:${p[1]}`).join(", ")})</div>
            ) : null}
            {shotXg ? (
              <div style={{ display: "flex", marginTop: 18, fontSize: 24, padding: "6px 18px", borderRadius: 999, background: "#1b2530" }}>
                xG {shotXg[0]!.toFixed(1)} – {shotXg[1]!.toFixed(1)}
              </div>
            ) : null}
          </div>
          <Team side="away" />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 24 }}>
          <div style={{ display: "flex", color: "#9aa7b8" }}>{detail.box?.venue ?? ""}{detail.box?.attendance ? ` · ${detail.box.attendance.toLocaleString("cs-CZ")} diváků` : ""}</div>
          <div style={{ display: "flex", fontWeight: 800 }}>
            Hokej<span style={{ color: "#2a9fe0" }}>Hub</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fontData.length ? fontData : undefined, headers: { "cache-control": "public, s-maxage=120, stale-while-revalidate=600" } },
  );
}
