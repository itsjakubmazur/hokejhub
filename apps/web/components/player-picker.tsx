"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { SearchHit } from "@/lib/server/hub";
import { PlayerPhoto } from "./player-photo";

/** Search box that writes the chosen player id into a URL param. */
export function PlayerPicker({ param, placeholder }: { param: string; placeholder: string }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const { data } = useQuery({
    queryKey: ["search", q.trim()],
    queryFn: async () => ((await (await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)).json()) as { hits: SearchHit[] }).hits,
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  });
  const players = (data ?? []).filter((h) => h.kind === "player").slice(0, 6);
  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {players.length && q ? (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          {players.map((h) => (
            <li key={h.id}>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.set(param, h.id);
                  setQ("");
                  router.push(`${path}?${next}`);
                }}
              >
                <PlayerPhoto src={h.image} alt={h.name} size={28} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{h.name}</span>
                  <span className="block truncate text-xs text-muted">{h.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
