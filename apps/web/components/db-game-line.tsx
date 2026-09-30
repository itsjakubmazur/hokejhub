import Link from "next/link";
import type { GameRowDb } from "@/lib/server/queries";
import { seasonLabel } from "@/lib/format";
import { ClubLogo } from "./club-logo";

const SUFFIX = { OT: "pp", SO: "sn", REG: "" } as const;

/** One archived game: date · home logo name score name logo · note. */
export function DbGameLine({ g, note, showSeason = true }: { g: GameRowDb; note?: React.ReactNode; showSeason?: boolean }) {
  const hw = (g.home_score ?? 0) > (g.away_score ?? 0);
  return (
    <Link
      href={`/zapas/${g.id}`}
      className="grid grid-cols-[64px_1fr_auto_1fr] items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-2 sm:grid-cols-[76px_1fr_auto_1fr_auto]"
    >
      <span className="text-[11px] leading-tight text-muted tabular">
        {new Date(g.start_at).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" })}
        {showSeason && g.phase === "playoff" ? <span className="block text-gold">play-off</span> : null}
      </span>
      <span className={`flex min-w-0 items-center justify-end gap-1.5 text-right ${hw ? "font-semibold" : ""}`}>
        <span className="truncate">{g.home_name}</span>
        <ClubLogo src={g.home_logo} alt="" size={26} />
      </span>
      <span className="rounded-md bg-surface-2 px-2 py-0.5 text-center font-bold tabular">
        {g.home_score}:{g.away_score}
        {g.decided_in && g.decided_in !== "REG" ? <sup className="ml-0.5 text-[9px] font-medium text-muted">{SUFFIX[g.decided_in]}</sup> : null}
      </span>
      <span className={`flex min-w-0 items-center gap-1.5 ${!hw ? "font-semibold" : ""}`}>
        <ClubLogo src={g.away_logo} alt="" size={26} />
        <span className="truncate">{g.away_name}</span>
      </span>
      {note ? <span className="col-span-4 text-right text-xs text-muted sm:col-span-1">{note}</span> : showSeason && g.season ? <span className="hidden text-xs text-muted sm:inline">{seasonLabel(g.season)}</span> : null}
    </Link>
  );
}
