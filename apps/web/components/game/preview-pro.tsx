"use client";

import type { Game } from "@hokejhub/core";
import { seasonLabel } from "@/lib/format";
import type { ElhPreview, PreviewLeader } from "@/lib/server/preview";
import { Crests, Duel, FormRings, VersusBar, type DuelSide } from "./versus";

const dec = (v: number, d = 2) => v.toFixed(d).replace(".", ",");
const pctText = (v: number | null) => (v === null ? "–" : `${dec(v * 100, 1)} %`);
const role = (p: string | null) => (p === "O" || p === "D" ? "obránce" : p === "B" || p === "G" ? "brankář" : "útočník");

function side(p: PreviewLeader | null, value: (p: PreviewLeader) => string): DuelSide | null {
  return p ? { id: p.id, name: p.name.split(" ").slice(-1)[0]!, photo: p.photo, sub: role(p.position), value: value(p) } : null;
}

/** Team against team: form, goals, shots and special teams as mirrored bars. */
export function PreviewTeams({ game, preview }: { game: Game; preview: ElhPreview }) {
  const { home: h, away: a } = preview;
  const per = (v: number, gp: number) => (gp ? v / gp : 0);
  return (
    <div>
      <Crests game={game} />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line py-3">
        <FormRings form={h.form} />
        <span className="label text-[11px] text-fg">Forma</span>
        <FormRings form={a.form} align="end" />
      </div>
      <div className="pt-1">
        <VersusBar label="Vstřelené góly" home={h.gf} away={a.gf} />
        <VersusBar label="Inkasované góly" home={h.ga} away={a.ga} lowerIsBetter delay={0.04} />
        <VersusBar
          label="Góly na zápas"
          home={per(h.gf, h.gp)}
          away={per(a.gf, a.gp)}
          homeText={dec(per(h.gf, h.gp))}
          awayText={dec(per(a.gf, a.gp))}
          delay={0.08}
        />
        <VersusBar
          label="Inkasované na zápas"
          home={per(h.ga, h.gp)}
          away={per(a.ga, a.gp)}
          homeText={dec(per(h.ga, h.gp))}
          awayText={dec(per(a.ga, a.gp))}
          lowerIsBetter
          delay={0.12}
        />
        {h.stats && a.stats ? (
          <>
            <VersusBar
              label="Střely na zápas"
              home={h.stats.sfPg}
              away={a.stats.sfPg}
              homeText={dec(h.stats.sfPg, 1)}
              awayText={dec(a.stats.sfPg, 1)}
              delay={0.16}
            />
            <VersusBar
              label="Střely soupeře na zápas"
              home={h.stats.saPg}
              away={a.stats.saPg}
              homeText={dec(h.stats.saPg, 1)}
              awayText={dec(a.stats.saPg, 1)}
              lowerIsBetter
              delay={0.2}
            />
            <VersusBar
              label="Přesilové hry"
              home={h.stats.ppPct ?? 0}
              away={a.stats.ppPct ?? 0}
              homeText={pctText(h.stats.ppPct)}
              awayText={pctText(a.stats.ppPct)}
              delay={0.24}
            />
            <VersusBar
              label="Oslabení"
              home={h.stats.pkPct ?? 0}
              away={a.stats.pkPct ?? 0}
              homeText={pctText(h.stats.pkPct)}
              awayText={pctText(a.stats.pkPct)}
              delay={0.28}
            />
          </>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Základní část {seasonLabel(preview.season)}
        {preview.previousSeason ? " – nová sezóna má zatím málo zápasů, srovnáváme minulou" : ""}.
      </p>
    </div>
  );
}

/** Each team's top scorer, goal scorer and playmaker, face to face. */
export function PreviewPlayers({ preview }: { preview: ElhPreview }) {
  const { home: h, away: a } = preview;
  return (
    <div>
      <Duel
        title="Produktivita"
        home={side(h.top.points, (p) => `${p.pts} (${p.g}+${p.a})`)}
        away={side(a.top.points, (p) => `${p.pts} (${p.g}+${p.a})`)}
      />
      <Duel title="Nejlepší střelci" home={side(h.top.goals, (p) => String(p.g))} away={side(a.top.goals, (p) => String(p.g))} />
      <Duel title="Nejlepší nahrávači" home={side(h.top.assists, (p) => String(p.a))} away={side(a.top.assists, (p) => String(p.a))} />
    </div>
  );
}

/** The likely starters: most games in net this season. */
export function PreviewGoalies({ preview }: { preview: ElhPreview }) {
  const h = preview.home.goalie;
  const a = preview.away.goalie;
  if (!h || !a) return null;
  const sv = (v: number | null) => (v === null ? 0 : v / 100);
  return (
    <div>
      <Duel
        home={{ id: h.id, name: h.name.split(" ").slice(-1)[0]!, photo: h.photo, sub: "brankář", value: "" }}
        away={{ id: a.id, name: a.name.split(" ").slice(-1)[0]!, photo: a.photo, sub: "brankář", value: "" }}
      />
      <div className="pt-1">
        <VersusBar label="Zápasy" home={h.gp} away={a.gp} />
        <VersusBar label="Výhry" home={h.wins} away={a.wins} delay={0.04} />
        <VersusBar
          label="Průměr gólů na zápas"
          home={h.gaa ?? 0}
          away={a.gaa ?? 0}
          homeText={h.gaa !== null ? dec(h.gaa) : "–"}
          awayText={a.gaa !== null ? dec(a.gaa) : "–"}
          lowerIsBetter
          delay={0.08}
        />
        <VersusBar
          label="Úspěšnost zákroků"
          home={sv(h.svPct)}
          away={sv(a.svPct)}
          homeText={h.svPct !== null ? `${dec(h.svPct)} %` : "–"}
          awayText={a.svPct !== null ? `${dec(a.svPct)} %` : "–"}
          delay={0.12}
        />
        <VersusBar label="Čistá konta" home={h.shutouts} away={a.shutouts} delay={0.16} />
      </div>
    </div>
  );
}
