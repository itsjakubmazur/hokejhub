import { Flag } from "lucide-react";
import Link from "next/link";
import { PlayerPhoto } from "../player-photo";
import { Card, Empty } from "../ui/card";
import type { UpcomingMilestone } from "@/lib/server/queries";
import { CS, csCount } from "@hokejhub/core";

const LABEL: Record<UpcomingMilestone["kind"], string> = {
  career_gp: "zápas v extralize",
  club_gp: "zápas za klub",
  career_g: "gól v extralize",
  club_g: "gól za klub",
  career_pts: "bod v extralize",
  club_pts: "bod za klub",
};

const unit = (kind: UpcomingMilestone["kind"]) => (kind.endsWith("_gp") ? CS.zapas : kind.endsWith("_g") ? CS.gol : CS.bod);

/** The club's skaters closest to a round number — who is about to play their 500th, score their 100th. */
export function UpcomingMilestones({ items }: { items: UpcomingMilestone[] }) {
  return (
    <Card title="Blížící se milníky" icon={Flag}>
      {items.length === 0 ? (
        <Empty>Nikdo z kádru není blízko kulatému číslu.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((m, i) => {
            const pct = Math.round((m.current / m.target) * 100);
            return (
              <li key={`${m.player_id}-${m.kind}`} className="rise flex items-center gap-3 py-2" style={{ animationDelay: `${i * 40}ms` }}>
                <PlayerPhoto src={m.headshot} alt={m.name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link href={`/hrac/${m.player_id}?tab=milniky`} className="truncate text-sm font-semibold hover:text-accent">
                      {m.name}
                    </Link>
                    <span className="shrink-0 text-xs text-muted tabular">
                      chybí <b className="text-fg">{csCount(m.remaining, unit(m.kind))}</b>
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <span className="truncate">
                      {m.target}. {LABEL[m.kind]}
                    </span>
                    <span className="tabular">({m.current})</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                    <div className={`h-full rounded-full ${m.remaining <= 3 ? "bg-gold" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
