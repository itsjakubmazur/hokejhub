import type { Game } from "@hokejhub/core";
import { formatTime } from "@/lib/format";

export function StatusPill({ game, className = "" }: { game: Game; className?: string }) {
  const base = `inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium tabular ${className}`;
  switch (game.status) {
    case "live":
    case "intermission":
      return (
        <span className={`${base} bg-live/12 text-live`}>
          <span className="live-dot size-1.5 rounded-full bg-live" />
          {game.statusLabel}
          {game.status === "live" && game.clock ? <span className="opacity-80">· {game.clock}</span> : null}
        </span>
      );
    case "final":
      return <span className={`${base} bg-surface-2 text-muted`}>{game.statusLabel}</span>;
    case "postponed":
    case "cancelled":
      return <span className={`${base} bg-gold/15 text-gold`}>{game.statusLabel}</span>;
    default:
      return <span className={`${base} bg-accent-soft text-accent`}>{formatTime(game.startAt)}</span>;
  }
}
