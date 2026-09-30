/**
 * Automatic Czech match report from structured data (no LLM): result, decisive goal, comebacks,
 * standout players, goalies, shots/xG verdict and attendance. Sentences are built to avoid
 * gender/number agreement on team names (Kometa / Pardubice / Sparta all read correctly).
 */
import type { HokejczMatch } from "../sources/hokejcz.ts";
import { CS, csCount } from "../domain/cs.ts";

export interface RecapExtras {
  /** Expected goals [home, away]. */
  xg?: [number, number] | null;
  /** Pre-game model probability of a home win (incl. OT). */
  homeWinProb?: number | null;
}

const nice = (n: string) => n.replace(/\s+/g, " ").trim().split(" ").map((p) => (p === p.toUpperCase() && p.length > 1 ? p[0] + p.slice(1).toLowerCase() : p)).join(" ");
const secs = (t: string) => {
  const m = /^(\d+):(\d{2})$/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};
const minute = (t: string) => Math.floor(secs(t) / 60) + 1;
const fmt1 = (v: number) => v.toFixed(1).replace(".", ",");
const pts = (g: number, a: number) => `${g}+${a}`;

export function matchRecap(box: HokejczMatch, extras: RecapExtras = {}): string[] {
  const h = box.homeScore;
  const a = box.awayScore;
  if (h === null || a === null || box.goals.length + h + a === 0 && !box.statusLabel) return [];
  const out: string[] = [];
  const homeWon = h > a;
  const winner = homeWon ? box.home : box.away;
  const loser = homeWon ? box.away : box.home;
  const how = box.decidedIn === "OT" ? " po prodloužení" : box.decidedIn === "SO" ? " po samostatných nájezdech" : "";
  const score = `${Math.max(h, a)}:${Math.min(h, a)}`;
  const goals = [...box.goals].sort((x, y) => secs(x.time) - secs(y.time));

  // 1) Headline.
  if (h === a) {
    out.push(`${box.home.shortName} a ${box.away.shortName} se rozešli smírně ${h}:${a}.`);
  } else {
    const where = homeWon ? "před vlastními fanoušky" : "na ledě soupeře";
    const margin = Math.abs(h - a);
    const tone = box.decidedIn !== "REG" && box.decidedIn ? "" : margin >= 4 ? " jednoznačně" : margin === 1 ? " těsně" : "";
    out.push(`${winner.shortName}${tone} vyhrává ${where} ${score}${how} proti týmu ${loser.shortName}.`);
  }

  // 2) Story of the goals: opener, comeback, decisive goal.
  let hs = 0;
  let as = 0;
  let worstForWinner = 0;
  let winnerGoal: (typeof goals)[number] | null = null;
  for (const g of goals) {
    if (g.team === box.home.abbrev) hs++;
    else as++;
    const diff = homeWon ? hs - as : as - hs;
    worstForWinner = Math.min(worstForWinner, diff);
    const winnerScore = homeWon ? hs : as;
    const loserFinal = homeWon ? a : h;
    if (!winnerGoal && box.decidedIn !== "SO" && g.team === winner.abbrev && winnerScore === loserFinal + 1) winnerGoal = g;
  }
  if (goals[0]) {
    const o = goals[0];
    out.push(`Skóre otevřel ${nice(o.scorer.name)} v ${minute(o.time)}. minutě${o.situation && o.situation !== "5/5" ? (o.situation === "EN" ? " do prázdné branky" : /^5\/[34]|4\/3/.test(o.situation) ? " v přesilovce" : /^[34]\/5|3\/4/.test(o.situation) ? " v oslabení" : "") : ""}.`);
  }
  if (h !== a && worstForWinner <= -2) {
    out.push(`Vítěz přitom prohrával už o ${csCount(-worstForWinner, CS.gol)} – obrat jako řemen.`);
  } else if (h !== a && worstForWinner === -1 && goals.length >= 3) {
    out.push("Vítěz musel otáčet nepříznivý stav.");
  }
  if (winnerGoal) {
    const late = secs(winnerGoal.time) >= 55 * 60 && secs(winnerGoal.time) <= 60 * 60;
    const ot = secs(winnerGoal.time) > 60 * 60;
    out.push(
      `${ot ? "V prodloužení rozhodl" : late ? "Vítězný gól přišel až v koncovce – trefil se" : "Vítězný gól vstřelil"} ${nice(winnerGoal.scorer.name)} (${winnerGoal.time})${
        winnerGoal.assists.length ? `, asistence: ${winnerGoal.assists.map((x) => nice(x.name)).join(", ")}` : ""
      }.`,
    );
  } else if (box.decidedIn === "SO") {
    out.push("Po 65 minutách bez rozhodnutí přišly na řadu nájezdy.");
  }

  // 3) Standouts: hat-tricks, best point totals.
  const all = [...box.skaters.home.map((s) => ({ s, team: box.home })), ...box.skaters.away.map((s) => ({ s, team: box.away }))];
  const hatTricks = all.filter((x) => x.s.goals >= 3);
  for (const x of hatTricks) out.push(`${nice(x.s.player.name)} (${x.team.shortName}) zapsal hattrick${x.s.assists ? ` a přidal ${x.s.assists} ${x.s.assists === 1 ? "asistenci" : "asistence"}` : ""}.`);
  const best = [...all].filter((x) => x.s.goals < 3).sort((p, q) => q.s.points - p.s.points || q.s.goals - p.s.goals)[0];
  if (best && best.s.points >= 3) out.push(`Nejproduktivnější hráč: ${nice(best.s.player.name)} (${best.team.shortName}), ${pts(best.s.goals, best.s.assists)}.`);

  // 4) Goalies.
  for (const side of ["home", "away"] as const) {
    const list = box.goalies[side].filter((g) => (g.toiSeconds ?? 0) > 0 || g.saves > 0);
    const team = side === "home" ? box.home : box.away;
    const conceded = side === "home" ? a : h;
    if (list.length === 1 && conceded === 0 && box.decidedIn !== "SO") {
      out.push(`Čisté konto: ${nice(list[0]!.player.name)} (${team.shortName}) s ${csCount(list[0]!.saves, CS.zakrokem)}.`);
    } else if (list.length === 1 && list[0]!.saves >= 38) {
      out.push(`${nice(list[0]!.player.name)} (${team.shortName}) předvedl ${csCount(list[0]!.saves, CS.zakrok)}${list[0]!.savePct ? ` (${fmt1(list[0]!.savePct)} %)` : ""}.`);
    }
    if (list.length >= 2) out.push(`Střídání v brankovišti (${team.shortName}): ${list.map((g) => nice(g.player.name)).join(" → ")}.`);
  }

  // 5) Shots and xG verdict.
  const sog = box.teamStats["Střely na branku"];
  const xg = extras.xg;
  if (sog || xg) {
    const parts: string[] = [];
    if (sog) parts.push(`střely na branku ${sog[0]}:${sog[1]}`);
    if (xg) parts.push(`xG ${fmt1(xg[0])}:${fmt1(xg[1])}`);
    let verdict = "";
    if (xg && h !== a) {
      const wx = homeWon ? xg[0] - xg[1] : xg[1] - xg[0];
      verdict = wx <= -0.8 ? " Podle kvality šancí šlo spíš o šťastnou výhru." : wx >= 1.5 ? " Výhra plně odpovídá převaze v šancích." : "";
    }
    out.push(`${parts.join(", ").replace(/^./, (c) => c.toUpperCase())}.${verdict}`);
  }

  // 6) Model surprise.
  if (extras.homeWinProb != null && h !== a) {
    const pWinner = homeWon ? extras.homeWinProb : 1 - extras.homeWinProb;
    if (pWinner < 0.3) out.push(`Překvapení: náš model dával vítězi před zápasem jen ${Math.round(pWinner * 100)} % šanci.`);
  }

  // 7) Attendance.
  if (box.attendance) {
    const full = box.capacity && box.attendance >= box.capacity * 0.99;
    out.push(full ? `Vyprodáno – ${csCount(box.attendance, CS.divak)}.` : `Na zápas přišlo ${csCount(box.attendance, CS.divak)}${box.capacity ? ` (${Math.round((box.attendance / box.capacity) * 100)} % kapacity)` : ""}.`);
  }
  if (box.series) out.push(`Stav série: ${box.series}.`);
  return out;
}
