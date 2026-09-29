"use client";

import { useEffect, useRef, useState } from "react";

/** Returns a counter that bumps whenever the given score changes after the first render. */
export function useGoalFlash(home: number | null, away: number | null): { home: number; away: number } {
  const prev = useRef<[number | null, number | null]>([home, away]);
  const [flash, setFlash] = useState({ home: 0, away: 0 });
  useEffect(() => {
    const [ph, pa] = prev.current;
    prev.current = [home, away];
    const homeScored = ph !== null && home !== null && home > ph;
    const awayScored = pa !== null && away !== null && away > pa;
    if (!homeScored && !awayScored) return;
    setFlash((f) => ({ home: f.home + (homeScored ? 1 : 0), away: f.away + (awayScored ? 1 : 0) }));
    if ("vibrate" in navigator) navigator.vibrate?.([30, 40, 30]);
  }, [home, away]);
  return flash;
}
