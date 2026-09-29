"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SearchHit } from "@/lib/server/hub";
import { ClubLogo } from "./club-logo";
import { PlayerPhoto } from "./player-photo";

const PAGES = [
  { href: "/", name: "Zápasy", sub: "Dnešní program a výsledky" },
  { href: "/liga/cz-elh", name: "Extraliga – tabulka", sub: "Živá, formová, doma/venku" },
  { href: "/predikce", name: "Predikce", sub: "Elo model vs. kurzy" },
  { href: "/dnes-v-historii", name: "Tento den v historii", sub: "Zápasy, narozeniny, hattricky" },
  { href: "/rekordy", name: "Rekordy extraligy", sub: "Zápasy, sezóny, kariéry" },
  { href: "/porovnat", name: "Porovnat hráče", sub: "Kariéra vedle sebe" },
];

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const dq = useDebounced(q.trim(), 150);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["search", dq],
    queryFn: async () => ((await (await fetch(`/api/search?q=${encodeURIComponent(dq)}`)).json()) as { hits: SearchHit[] }).hits,
    enabled: open && dq.length >= 2,
    staleTime: 60_000,
  });

  const pages = PAGES.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  const items: { href: string; name: string; sub: string | null; hit: SearchHit | null }[] = [
    ...(data ?? []).map((h) => ({ href: h.kind === "team" ? `/tym/${h.id}` : `/hrac/${h.id}`, name: h.name, sub: h.sub, hit: h })),
    ...pages.map((p) => ({ href: p.href, name: p.name, sub: p.sub, hit: null })),
  ];

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm text-muted hover:text-fg"
        aria-label="Hledat"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <span className="hidden md:inline">Hledat</span>
        <kbd className="hidden rounded bg-surface-2 px-1.5 text-[10px] md:inline">⌘K</kbd>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: -16, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -16, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 border-b border-line px-4">
                <svg viewBox="0 0 24 24" className="size-5 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                </svg>
                <input
                  ref={input}
                  autoFocus
                  value={q}
                  onChange={(e) => (setQ(e.target.value), setActive(0))}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActive((a) => Math.min(a + 1, items.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActive((a) => Math.max(a - 1, 0));
                    }
                    if (e.key === "Enter" && items[active]) go(items[active].href);
                  }}
                  placeholder="Hráč, tým nebo stránka…"
                  className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
                />
                {isFetching ? <span className="puck-spin size-4 rounded-full border-2 border-accent border-t-transparent" /> : null}
              </div>
              <ul className="max-h-[60vh] overflow-y-auto p-2">
                {items.map((it, i) => (
                  <li key={it.href}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(it.href)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${i === active ? "bg-accent-soft" : ""}`}
                    >
                      {it.hit ? (
                        it.hit.kind === "team" ? (
                          <ClubLogo src={it.hit.image} alt="" size={32} />
                        ) : (
                          <PlayerPhoto src={it.hit.image} alt={it.hit.name} size={32} />
                        )
                      ) : (
                        <span className="grid size-8 place-items-center rounded-lg bg-surface-2 text-muted">→</span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{it.name}</span>
                        <span className="block truncate text-xs text-muted">{it.sub}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {dq.length >= 2 && data && data.length === 0 && pages.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-muted">Nic nenalezeno.</li>
                ) : null}
              </ul>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
