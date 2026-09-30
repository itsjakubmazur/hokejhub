import { Flag } from "lucide-react";
import Link from "next/link";
import { Portrait } from "../portrait";
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

/** The club's skaters closest to a round number, laid out like the milestones in the game center. */
export function UpcomingMilestones({ items }: { items: UpcomingMilestone[] }) {
  return (
    <Card title="Blížící se milníky" icon={Flag}>
      {items.length === 0 ? (
        <Empty>Nikdo z kádru není blízko kulatému číslu.</Empty>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">
          {items.map((m, i) => {
            const close = m.remaining <= 3;
            return (
              <li
                key={`${m.player_id}-${m.kind}`}
                className={`rise flex gap-3 border p-2.5 sm:gap-4 sm:p-3 ${close ? "border-gold/50 bg-gold/5" : "border-line"}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Portrait src={m.headshot} alt={m.name} width={60} className="sm:!w-[84px] sm:!h-[112px]" />
                <div className="flex min-w-0 flex-col justify-center">
                  <span className={`display text-4xl leading-none tabular sm:text-5xl ${close ? "text-gold" : ""}`}>{m.target}.</span>
                  <span className="mt-1 text-sm text-muted">{LABEL[m.kind]}</span>
                  <Link href={`/hrac/${m.player_id}?tab=milniky`} className="mt-2 truncate font-semibold hover:text-accent">
                    {m.name}
                  </Link>
                  <span className="text-xs text-muted">
                    chybí <b className="text-fg">{csCount(m.remaining, unit(m.kind))}</b> · teď {m.current}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
