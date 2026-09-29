"use client";

import { useSyncExternalStore } from "react";
import type { Tip } from "@hokejhub/core";

/** Score tips, stored per browser. */
export interface TipEntry {
  gameId: string;
  date: string;
  startAt: string;
  home: string;
  away: string;
  homeLogo: string | null;
  awayLogo: string | null;
  tip: Tip;
  model: Tip;
}

const KEY = "hh:tips";
const listeners = new Set<() => void>();
let cache: Record<string, TipEntry> | null = null;
const EMPTY: Record<string, TipEntry> = {};

function read() {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, TipEntry>;
  } catch {
    cache = {};
  }
  return cache;
}

export function saveTip(e: TipEntry | { gameId: string; remove: true }) {
  const next = { ...read() };
  if ("remove" in e) delete next[e.gameId];
  else next[e.gameId] = e;
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
  listeners.forEach((l) => l());
}

export function useTips() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );
}
