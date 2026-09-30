import type { Metadata } from "next";
import { Medal } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import Link from "next/link";
import type { NationalTournament } from "@hokejhub/core";
import { HistoryTabs } from "@/components/history-tabs";
import { Card, Empty, Stat } from "@/components/ui/card";
import { getNationalHistory } from "@/lib/server/history";

export const metadata: Metadata = { title: "Reprezentace na MS" };
export const dynamic = "force-dynamic";

/** Medal colours, far apart in lightness so gold and bronze never blur together. */
const MEDAL = ["#e3b12c", "#a9b4bd", "#8f4f26"];
const MEDAL_NAME = ["zlato", "stříbro", "bronz"];

export default async function NationalPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const all = await getNationalHistory();
  if (all.length === 0) return <Empty>Historii reprezentace se nepodařilo načíst z hokej.cz.</Empty>;
  const { r } = await searchParams;
  const selected = all.find((t) => String(t.year) === r) ?? null;
  const played = all.filter((t) => t.ourPlace);
  const medals = [1, 2, 3].map((p) => played.filter((t) => t.ourPlace === p));
  const home = played.filter((t) => /ČSR|ČSSR|ČSFR|Česko/.test(t.place));

  return (
    <div className="space-y-5">
      <PageHero kicker="1920 – dnes" title="Reprezentace na mistrovství světa" icon={Medal}>
        <p>
          Československo a od roku 1993 Česká republika na MS, včetně olympijských turnajů, které se do roku 1968 počítaly i jako mistrovství světa.
        </p>
      </PageHero>
      <HistoryTabs active="repre" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {medals.map((list, i) => (
          <Stat
            key={i}
            label={MEDAL_NAME[i]!}
            value={list.length}
            sub={
              list
                .slice(-3)
                .map((t) => t.year)
                .join(", ") + (list.length > 3 ? " …" : "")
            }
          />
        ))}
        <Stat label="Turnajů" value={played.length} sub={`${home.length}× doma`} />
      </div>

      {selected ? <TournamentDetail t={selected} /> : null}

      <Card title="Umístění v čase">
        <PlacementChart tournaments={all} selected={selected?.year ?? null} />
      </Card>

      <Card title="Všechna mistrovství">
        <ol className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {[...all].reverse().map((t) => (
            <li key={t.year}>
              <Link
                href={`/historie/reprezentace?r=${t.year}`}
                scroll={false}
                className={`flex items-center gap-3 border px-3 py-2 transition-colors hover:border-fg ${selected?.year === t.year ? "border-fg" : "border-line"}`}
              >
                <span className="display w-12 text-xl tabular">{t.year}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted">
                  {t.place}
                  {t.olympic ? " · ZOH" : ""}
                </span>
                <PlaceBadge place={t.ourPlace} />
              </Link>
            </li>
          ))}
        </ol>
      </Card>
      <p className="text-[11px] text-muted">Zdroj: hokej.cz – Historie, reprezentace.</p>
    </div>
  );
}

function PlaceBadge({ place }: { place: number | null }) {
  if (!place) return <span className="w-8 text-center text-xs text-muted">–</span>;
  const medal = place <= 3;
  return (
    <span
      className="display grid h-7 w-8 place-items-center text-base tabular"
      style={medal ? { background: MEDAL[place - 1], color: "#10151a" } : { border: "1px solid var(--border)" }}
      title={medal ? MEDAL_NAME[place - 1] : `${place}. místo`}
    >
      {place}.
    </span>
  );
}

/** Dot per championship: x = year, y = our place (1 on top). Medals filled in medal colours, Olympic tournaments ringed. */
function PlacementChart({ tournaments, selected }: { tournaments: NationalTournament[]; selected: number | null }) {
  const pts = tournaments.filter((t) => t.ourPlace);
  const W = 900;
  const H = 240;
  const pad = { l: 34, r: 12, t: 12, b: 26 };
  const maxPlace = Math.max(8, ...pts.map((t) => t.ourPlace!));
  const x0 = 1920;
  const x1 = Math.max(2000, ...tournaments.map((t) => t.year)) + 1;
  const x = (y: number) => pad.l + ((y - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  const y = (p: number) => pad.t + ((p - 1) / (maxPlace - 1)) * (H - pad.t - pad.b);
  const path = pts.map((t, i) => `${i ? "L" : "M"}${x(t.year).toFixed(1)},${y(t.ourPlace!).toFixed(1)}`).join("");
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img" aria-label="Umístění reprezentace na mistrovstvích světa od roku 1920">
        {[1, 2, 3, 5, maxPlace].map((p) => (
          <g key={p}>
            <line x1={pad.l} x2={W - pad.r} y1={y(p)} y2={y(p)} stroke="var(--border)" strokeDasharray={p <= 3 ? "" : "3 4"} />
            <text x={pad.l - 8} y={y(p) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {p}.
            </text>
          </g>
        ))}
        {[1920, 1940, 1960, 1980, 2000, 2020].filter((yr) => yr < x1).map((yr) => (
          <text key={yr} x={x(yr)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">
            {yr}
          </text>
        ))}
        <path d={path} fill="none" stroke="var(--muted)" strokeOpacity="0.45" strokeWidth="1.5" />
        {pts.map((t) => {
          const p = t.ourPlace!;
          const fill = p <= 3 ? MEDAL[p - 1] : "var(--surface)";
          const sel = t.year === selected;
          return (
            <a key={t.year} href={`/historie/reprezentace?r=${t.year}`}>
              <title>{`MS ${t.year} (${t.place}): ${p}. místo${t.olympic ? " – olympijský turnaj" : ""}`}</title>
              <circle cx={x(t.year)} cy={y(p)} r="11" fill="transparent" />
              <circle
                cx={x(t.year)}
                cy={y(p)}
                r={sel ? 7 : 5}
                fill={fill}
                stroke={t.olympic ? "var(--accent)" : p <= 3 ? "var(--surface)" : "var(--muted)"}
                strokeWidth={t.olympic ? 2.5 : 2}
              />
            </a>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
        {MEDAL_NAME.map((m, i) => (
          <span key={m} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: MEDAL[i] }} />
            {m}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-accent" />
          olympijský turnaj
        </span>
      </div>
    </div>
  );
}

function TournamentDetail({ t }: { t: NationalTournament }) {
  return (
    <Card
      title={`${t.number ? `${t.number}. ` : ""}MS ${t.year}`}
      action={
        <Link href="/historie/reprezentace" scroll={false} className="text-xs text-muted hover:text-fg">
          zavřít
        </Link>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <div>
          <p className="text-sm text-muted">
            {t.place} · {t.dates}
            {t.olympic ? " · v rámci ZOH" : ""}
          </p>
          <ol className="mt-3 space-y-1 text-sm">
            {t.ranking.map((team, i) => {
              const us = i + 1 === t.ourPlace;
              return (
                <li key={team + i} className={`flex items-center gap-2 ${us ? "font-bold" : ""}`}>
                  <span className="w-5 text-right text-muted tabular">{i + 1}.</span>
                  {i < 3 ? <span className="size-2 rounded-full" style={{ background: MEDAL[i] }} /> : <span className="size-2" />}
                  {team}
                </li>
              );
            })}
          </ol>
          {t.ourPlace && t.ourPlace > t.ranking.length ? (
            <p className="mt-2 text-sm font-bold">Česko: {t.ourPlace}. místo</p>
          ) : null}
        </div>
        <div className="min-w-0 space-y-3 text-sm">
          {t.results ? (
            <div>
              <h3 className="label mb-1 text-muted">Naše zápasy</h3>
              <p>{t.results}</p>
            </div>
          ) : null}
          {t.roster ? (
            <div>
              <h3 className="label mb-1 text-muted">Sestava (v závorce góly)</h3>
              <p className="text-fg/85">{t.roster}</p>
            </div>
          ) : null}
          {t.notes.length ? (
            <details className="text-muted">
              <summary className="cursor-pointer">Systém a poznámky</summary>
              <div className="mt-2 space-y-1">
                {t.notes.map((n, i) => (
                  <p key={i}>{n}</p>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
