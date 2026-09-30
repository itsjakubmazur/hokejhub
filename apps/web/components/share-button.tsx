"use client";

import { Share2 } from "lucide-react";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

/** Native share sheet (mobile) or copy link, with a preview of the generated share card. */
export function ShareButton({ title, image }: { title: string; image: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* cancelled → fall through to preview */
      }
    }
    setOpen(true);
  };
  return (
    <>
      <button onClick={share} className="border border-board-line px-3 py-1 text-xs font-semibold text-board-muted hover:text-board-text" aria-label="Sdílet zápas">
        <Share2 className="mr-1.5 inline size-3.5 align-[-2px]" aria-hidden />
        Sdílet
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="w-full max-w-2xl space-y-3 rounded-2xl border border-line bg-surface p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- generated PNG */}
              <img src={image} alt={title} className="aspect-[1200/630] w-full rounded-xl bg-surface-2" />
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white"
                  onClick={async () => {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? "Zkopírováno ✓" : "Kopírovat odkaz"}
                </button>
                <a href={image} download="hokejhub-zapas.png" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold">
                  Stáhnout obrázek
                </a>
                <button className="ml-auto px-3 py-2 text-sm text-muted" onClick={() => setOpen(false)}>
                  Zavřít
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
