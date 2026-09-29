"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Comment, Game } from "@hokejhub/core";
import { Segmented } from "./segmented";

const KIND_STYLE: Record<string, string> = {
  goal: "border-l-4 border-live bg-live/10",
  penalty: "border-l-4 border-gold bg-gold/10",
  "period-start": "bg-accent-soft",
  "period-end": "bg-accent-soft",
  important: "border-l-4 border-accent",
};

export function Commentary({ comments, game }: { comments: Comment[]; game: Game }) {
  const [filter, setFilter] = useState<"all" | "key">("all");
  const list = filter === "key" ? comments.filter((c) => c.kind !== "normal") : comments;
  return (
    <div>
      <Segmented
        className="mb-3"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Vše" },
          { value: "key", label: "Jen důležité" },
        ]}
      />
      <ol className="space-y-2">
        <AnimatePresence initial={false}>
          {list.map((c) => (
            <motion.li
              key={c.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 rounded-xl p-3 ${KIND_STYLE[c.kind] ?? "bg-surface-2"}`}
            >
              <div className="w-12 shrink-0 text-center">
                <div className="text-sm font-bold tabular">{c.time ?? "–"}</div>
                {c.kind === "goal" ? (
                  <div className="mt-0.5 rounded bg-surface px-1 text-[11px] font-bold tabular">
                    {c.score[0]}:{c.score[1]}
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 text-sm leading-relaxed">
                {c.kind === "goal" ? (
                  <div className="mb-0.5 text-xs font-black uppercase tracking-wider text-live">
                    Gól {c.teamCode === game.home.abbrev ? game.home.shortName : c.teamCode === game.away.abbrev ? game.away.shortName : c.teamCode}
                    {c.emptyNet ? " · do prázdné branky" : ""}
                  </div>
                ) : null}
                <div className="[&_b]:font-semibold" dangerouslySetInnerHTML={{ __html: c.html }} />
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      <p className="mt-3 text-[11px] text-muted">Textový přenos: hokej.cz</p>
    </div>
  );
}
