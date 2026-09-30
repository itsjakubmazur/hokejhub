"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ClubLogo } from "../club-logo";
import { api } from "./api";

interface Message {
  id: number;
  nickname: string;
  club_logo: string | null;
  body: string;
  created_at: string;
  mine: boolean;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague" });

/** Group trash-talk wall, refreshed every 20 s while open. */
export function GroupWall({ group }: { group: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { data } = useQuery({
    queryKey: ["tip", "wall", group],
    queryFn: () => api<{ messages: Message[] }>(`wall?group=${group}`),
    refetchInterval: 20_000,
  });
  const send = useMutation({
    mutationFn: () => api("wall", { method: "POST", body: { group, body: text } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["tip", "wall", group] });
    },
  });
  const list = data?.messages ?? [];
  return (
    <div className="mt-3 border-t border-line pt-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) send.mutate();
        }}
      >
        <input
          id={`wall-${group}`}
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napiš něco do kabiny…"
          className="min-w-0 flex-1 border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button disabled={send.isPending} className="grid w-11 place-items-center bg-fg text-bg disabled:opacity-50" aria-label="Odeslat">
          <Send className="size-4" aria-hidden />
        </button>
      </form>
      {send.error ? <p className="mt-1 text-xs text-live">{(send.error as Error).message}</p> : null}
      <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        <AnimatePresence initial={false}>
          {list.map((m) => (
            <motion.li
              key={m.id}
              layout
              initial={{ opacity: 0, x: m.mine ? 24 : -24 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex gap-2 ${m.mine ? "flex-row-reverse text-right" : ""}`}
            >
              <ClubLogo src={m.club_logo} alt="" size={28} />
              <div className={`max-w-[80%] px-3 py-1.5 ${m.mine ? "bg-accent text-white" : "bg-surface-2"}`}>
                <div className={`text-[11px] ${m.mine ? "text-white/75" : "text-muted"}`}>
                  <b>{m.nickname}</b> · {when(m.created_at)}
                </div>
                <div className="whitespace-pre-wrap break-words text-sm">{m.body}</div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        {list.length === 0 ? <li className="py-3 text-center text-xs text-muted">Zatím ticho v kabině. Začni hecovat.</li> : null}
      </ul>
    </div>
  );
}
