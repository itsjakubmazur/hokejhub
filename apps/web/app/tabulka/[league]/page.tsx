import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListOrdered } from "lucide-react";
import { getLeague } from "@hokejhub/core";
import { PageHero } from "@/components/ui/page-hero";
import { Card, Empty } from "@/components/ui/card";
import { ClubLogo } from "@/components/club-logo";
import Link from "next/link";
import { getNhlTable, getOtherTable, OTHER_TABLES, type NhlView, type OtherTableGroup } from "@/lib/server/other-tables";

export const revalidate = 600;

export async function generateMetadata(props: PageProps<"/tabulka/[league]">): Promise<Metadata> {
  const { league } = await props.params;
  return { title: `Tabulka – ${league === "nhl" ? "NHL" : (OTHER_TABLES[league]?.name ?? getLeague(league).name)}` };
}

/** Columns past the basic ones, scrolled to sideways on phones. */
const EXTRA = ["V", "VP", "PP", "P"] as const;

const NHL_VIEWS: [NhlView, string][] = [
  ["divize", "Divize"],
  ["konference", "Konference"],
  ["liga", "Celá liga"],
];

async function NhlPage({ view }: { view: NhlView }) {
  const groups = await getNhlTable(view);
  return (
    <div className="space-y-4">
      <PageHero kicker="Tabulka" title="NHL" icon={ListOrdered}>
        Aktuální pořadí podle NHL.
      </PageHero>
      <div className="flex gap-1.5">
        {NHL_VIEWS.map(([v, label]) => (
          <Link
            key={v}
            href={v === "divize" ? "/tabulka/nhl" : `/tabulka/nhl?pohled=${v}`}
            className={`border px-3 py-1.5 text-sm font-semibold ${v === view ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      {!groups?.length ? (
        <Card>
          <Empty>Tabulku se teď nepodařilo načíst.</Empty>
        </Card>
      ) : (
        groups.map((g) => (
          <Card key={g.title} title={g.title} icon={ListOrdered}>
            <GroupTable group={g} />
          </Card>
        ))
      )}
    </div>
  );
}

function GroupTable({ group }: { group: OtherTableGroup }) {
  const hasExtra = EXTRA.filter((k) => group.rows.some((r) => r.values[k] != null));
  const cell = "px-1.5 py-1.5 text-right tabular-nums";
  const sticky = "sticky z-10 bg-surface shadow-[inset_0_1px_0_var(--border)]";
  return (
    <div className="-mx-3 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-max border-collapse text-[13px] sm:text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-muted">
            <th className={`${sticky} left-0 w-9 py-1.5 pl-3 text-left font-semibold sm:pl-0`}>#</th>
            <th className={`${sticky} left-9 py-1.5 pr-2 text-left font-semibold`}>Tým</th>
            <th className={`${cell} font-semibold`}>Z</th>
            <th className={`${cell} font-semibold`}>Skóre</th>
            <th className={`${cell} font-semibold`}>B</th>
            {hasExtra.map((k) => (
              <th key={k} className={`${cell} font-semibold text-muted`}>
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {group.rows.map((r, i) => (
            <tr key={`${r.team}-${i}`}>
              <td className={`${sticky} left-0 py-1.5 pl-3 font-semibold tabular-nums text-muted sm:pl-0`}>{r.rank ?? i + 1}.</td>
              <td className={`${sticky} left-9 max-w-[11rem] py-1.5 pr-2 sm:max-w-none`}>
                <span className="flex min-w-0 items-center gap-2">
                  <ClubLogo src={r.logo} alt="" size={20} />
                  <span className="truncate font-medium">{r.team}</span>
                </span>
              </td>
              <td className={`${cell} shadow-[inset_0_1px_0_var(--border)]`}>{r.gp ?? "–"}</td>
              <td className={`${cell} shadow-[inset_0_1px_0_var(--border)]`}>
                {r.gf != null && r.ga != null ? `${r.gf}:${r.ga}` : (r.values["Skóre"] ?? "–")}
              </td>
              <td className={`${cell} font-bold shadow-[inset_0_1px_0_var(--border)]`}>{r.pts ?? "–"}</td>
              {hasExtra.map((k) => (
                <td key={k} className={`${cell} text-muted shadow-[inset_0_1px_0_var(--border)] last:pr-3 sm:last:pr-1.5`}>
                  {r.values[k] ?? "–"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function OtherTablePage(props: PageProps<"/tabulka/[league]">) {
  const { league } = await props.params;
  if (league === "nhl") {
    const p = (await props.searchParams).pohled;
    return <NhlPage view={p === "konference" || p === "liga" ? p : "divize"} />;
  }
  const def = OTHER_TABLES[league];
  if (!def) notFound();
  const groups = await getOtherTable(league);
  return (
    <div className="space-y-4">
      <PageHero kicker="Tabulka" title={def.name} icon={ListOrdered}>
        Aktuální pořadí podle hokej.cz.
      </PageHero>
      {!groups?.length ? (
        <Card>
          <Empty>Tabulku se teď nepodařilo načíst.</Empty>
        </Card>
      ) : (
        groups.map((g) => (
          <Card key={g.title} title={g.title} icon={ListOrdered}>
            <GroupTable group={g} />
          </Card>
        ))
      )}
    </div>
  );
}
