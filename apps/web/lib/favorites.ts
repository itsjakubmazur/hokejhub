"use client";

import { useSyncExternalStore } from "react";

/** Favorite teams, stored per browser (no accounts). Names let us match feeds that lack our ids. */
export interface Favorite {
  id: string;
  names: string[];
}

const KEY = "hh:favorites";
const listeners = new Set<() => void>();
let cache: Favorite[] | null = null;

function read(): Favorite[] {
  if (cache) return cache;
  try {
    cache = (JSON.parse(localStorage.getItem(KEY) ?? "[]") as Favorite[]).filter((f) => f && typeof f.id === "string");
  } catch {
    cache = [];
  }
  return cache;
}

function write(list: Favorite[]) {
  cache = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* private mode */
  }
  listeners.forEach((l) => l());
}

const EMPTY: Favorite[] = [];

export function useFavorites() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );
  return {
    list,
    has: (id: string) => list.some((f) => f.id === id),
    toggle: (fav: Favorite) => write(list.some((f) => f.id === fav.id) ? list.filter((f) => f.id !== fav.id) : [...list, fav]),
  };
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Whether a scoreboard team (by display names) is one of the favorites. */
export function isFavoriteTeam(list: Favorite[], ...names: (string | undefined)[]) {
  const cand = names.filter(Boolean).map((n) => norm(n!)).filter((n) => n.length >= 3);
  return list.some((f) =>
    f.names.some((fn) => {
      const a = norm(fn);
      return cand.some((c) => a === c || a.includes(c) || c.includes(a));
    }),
  );
}
