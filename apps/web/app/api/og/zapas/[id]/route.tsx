/* eslint-disable @next/next/no-img-element -- satori renders plain <img> */
import { ImageResponse } from "next/og";
import { getLeague } from "@hokejhub/core";
import { getGameDetail } from "@/lib/server/game";
import { nice } from "@/lib/names";

/** Share card for a game: 1200×630 PNG with logos, score, scorers and xG. */
export const revalidate = 120;

let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 800 }[]> | null = null;
const DISPLAY = "Big Shoulders";

/** Brand faces with Czech glyphs; without a browser UA Google Fonts serves TTF, which satori reads. */
function loadFonts() {
  fonts ??= Promise.all(
    ([
      ["Archivo", 400],
      ["Big Shoulders", 800],
    ] as const).map(async ([family, weight]) => {
      const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`)).text();
      const urls = [...css.matchAll(/src: url\((.+?)\)/g)].map((m) => m[1]!);
      // The latin-ext block comes first; satori takes one file, so prefer the full (non-subset) file if present.
      const url = urls.at(-1)!;
      return { name: family, data: await (await fetch(url)).arrayBuffer(), weight };
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
        <div style={{ display: "flex", width: 168, height: 168, borderRadius: 6, background: "white", alignItems: "center", justifyContent: "center" }}>
          {t.logoUrl ? <img src={t.logoUrl} width={136} height={136} style={{ objectFit: "contain" }} alt="" /> : <div style={{ fontSize: 56, fontWeight: 800, color: "#111" }}>{t.abbrev}</div>}
        </div>
        <div style={{ marginTop: 20, fontSize: 52, fontWeight: 800, fontFamily: DISPLAY, textTransform: "uppercase" }}>{t.shortName}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 10, fontSize: 22, color: "#8797a3" }}>
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
          background: "#0b1116",
          color: "#eef3f6",
          fontFamily: "Archivo",
          padding: "40px 56px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#8797a3" }}>
          <div style={{ display: "flex" }}>{league.name}</div>
          <div style={{ display: "flex" }}>{when}</div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "flex-start", justifyContent: "space-between", paddingTop: 56 }}>
          <Team side="home" />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 8 }}>
            {live ? (
              <div style={{ display: "flex", fontSize: 28, fontWeight: 800, color: "#ff5467", marginBottom: 8, fontFamily: DISPLAY }}>ŽIVĚ {g.clock ?? ""}</div>
            ) : null}
            <div style={{ display: "flex", gap: 12, fontFamily: DISPLAY, fontWeight: 800, color: "#ffb13d" }}>
              {(started ? [g.homeScore, g.awayScore] : ["–", "–"]).map((v, i) => (
                <div key={i} style={{ display: "flex", width: 140, height: 170, alignItems: "center", justifyContent: "center", background: "#16212a", fontSize: 150 }}>
                  {String(v)}
                </div>
              ))}
            </div>
            {suffix ? <div style={{ display: "flex", fontSize: 28, color: "#8797a3" }}>{suffix}</div> : null}
            {g.periods.length ? (
              <div style={{ display: "flex", fontSize: 24, color: "#8797a3", marginTop: 6 }}>({g.periods.map((p) => `${p[0]}:${p[1]}`).join(", ")})</div>
            ) : null}
            {shotXg ? (
              <div style={{ display: "flex", marginTop: 18, fontSize: 24, padding: "6px 18px", borderRadius: 4, background: "#16212a" }}>
                xG {shotXg[0]!.toFixed(1)} – {shotXg[1]!.toFixed(1)}
              </div>
            ) : null}
          </div>
          <Team side="away" />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 24 }}>
          <div style={{ display: "flex", color: "#8797a3" }}>{detail.box?.venue ?? ""}{detail.box?.attendance ? ` · ${detail.box.attendance.toLocaleString("cs-CZ")} diváků` : ""}</div>
          <div style={{ display: "flex", fontWeight: 800, fontFamily: DISPLAY, fontSize: 34, textTransform: "uppercase" }}>
            Hokej<span style={{ color: "#ff5467" }}>Hub</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fontData.length ? fontData : undefined, headers: { "cache-control": "public, s-maxage=120, stale-while-revalidate=600" } },
  );
}
