"use client";

import { useEffect, useState } from "react";
import type { ClockAnchor } from "@hokejhub/core";

/** Game clock that keeps running between feed updates, capped at the end of the period. */
export function LiveClock({ anchor, fallback }: { anchor: ClockAnchor | null; fallback: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!anchor?.running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [anchor?.running]);
  if (!anchor) return fallback ? <span className="tabular">{fallback}</span> : null;
  const periodEnd = (Math.floor(anchor.gameSeconds / 1200) + 1) * 1200;
  const drift = anchor.running ? Math.max(0, (now - Date.parse(anchor.writtenAt)) / 1000) : 0;
  const secs = Math.min(Math.floor(anchor.gameSeconds + drift), periodEnd);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <span className="tabular" title="Herní čas (odhad mezi aktualizacemi přenosu)">
      {mm}:{ss}
    </span>
  );
}
