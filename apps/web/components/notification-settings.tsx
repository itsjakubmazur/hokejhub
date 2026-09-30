"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { DEFAULT_LEAGUES, DEFAULT_PREFS, getLeague, TRIGGERS, type NotifyPrefs, type TriggerKind } from "@hokejhub/core";
import { useFavorites } from "@/lib/favorites";
import { Card } from "./ui/card";

const PREFS_KEY = "hh:notify-prefs";

function b64ToUint8(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "denied" | "off" | "on";

function loadPrefs(): Omit<NotifyPrefs, "teams"> {
  try {
    return { ...DEFAULT_PREFS, ...(JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<NotifyPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function initialState(): State {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return Notification.permission === "denied" ? "denied" : "loading";
}

/** Browser-only (permissions, localStorage), so skip server rendering. */
export function NotificationSettings({ vapidKey }: { vapidKey: string | null }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  return mounted ? <Settings vapidKey={vapidKey} /> : <Card>Načítám…</Card>;
}

function Settings({ vapidKey }: { vapidKey: string | null }) {
  const { list: favorites } = useFavorites();
  const [state, setState] = useState<State>(initialState);
  const [sub, setSub] = useState<PushSubscription | null>(null);
  const [prefs, setPrefs] = useState<Omit<NotifyPrefs, "teams">>(loadPrefs);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (state !== "loading") return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((s) => {
        setSub(s);
        setState(s ? "on" : "off");
      })
      .catch(() => setState("unsupported"));
  }, [state]);

  const teams = favorites.flatMap((f) => f.names.slice(0, 1));
  const payload = (s: PushSubscription, p = prefs) => ({ subscription: s.toJSON(), prefs: { ...p, teams: favorites.flatMap((f) => f.names) } });

  const save = async (p = prefs, s = sub) => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
    if (!s) return;
    await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload(s, p)) });
  };

  // Keep server-side team list in sync when favorites change.
  useEffect(() => {
    if (sub) void save(prefs, sub);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on favorites change
  }, [favorites.length]);

  const enable = async () => {
    if (!vapidKey) return setMsg("Server zatím nemá nastavené VAPID klíče.");
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(vapidKey) });
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload(s)) });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      setSub(s);
      setState("on");
      setMsg("Hotovo! Upozornění jsou zapnutá.");
    } catch (e) {
      setMsg(`Nepodařilo se: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!sub) return;
    setBusy(true);
    await fetch("/api/push/subscribe", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
    await sub.unsubscribe().catch(() => undefined);
    setSub(null);
    setState("off");
    setBusy(false);
  };

  const test = async () => {
    if (!sub) return;
    const res = await fetch("/api/push/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
    setMsg(res.ok ? "Testovací upozornění odesláno." : `Chyba: ${(await res.json()).error}`);
  };

  const update = (p: Omit<NotifyPrefs, "teams">) => {
    setPrefs(p);
    void save(p);
  };
  const toggleTrigger = (k: TriggerKind) =>
    update({ ...prefs, triggers: prefs.triggers.includes(k) ? prefs.triggers.filter((x) => x !== k) : [...prefs.triggers, k] });
  const toggleLeague = (k: string) => update({ ...prefs, leagues: prefs.leagues.includes(k) ? prefs.leagues.filter((x) => x !== k) : [...prefs.leagues, k] });

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-4">
          <motion.div
            animate={state === "on" ? { rotate: [0, -18, 14, -8, 0] } : {}}
            transition={{ duration: 0.8 }}
            className={`grid size-12 place-items-center ${state === "on" ? "bg-win/15 text-win" : "bg-surface-2 text-muted"}`}
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 003.4 0" />
              {state === "on" ? null : <path d="M3 3l18 18" />}
            </svg>
          </motion.div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">
              {state === "loading" ? "Zjišťuji…" : state === "on" ? "Upozornění jsou zapnutá" : state === "denied" ? "Upozornění jsou v prohlížeči zakázaná" : state === "unsupported" ? "Tento prohlížeč push neumí" : "Upozornění jsou vypnutá"}
            </div>
            <div className="text-xs text-muted">
              {state === "denied" ? "Povol je v nastavení webu v prohlížeči." : state === "unsupported" ? "Na iPhonu funguje jen po přidání na plochu (iOS 16.4+)." : "Každé zařízení se nastavuje zvlášť."}
            </div>
          </div>
          {state === "off" ? (
            <button disabled={busy} onClick={enable} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Zapnout
            </button>
          ) : state === "on" ? (
            <div className="flex gap-2">
              <button onClick={test} className="rounded-xl border border-line px-3 py-2 text-sm">
                Test
              </button>
              <button disabled={busy} onClick={disable} className="rounded-xl border border-line px-3 py-2 text-sm text-muted">
                Vypnout
              </button>
            </div>
          ) : null}
        </div>
        {msg ? <p className="mt-3 text-sm text-muted">{msg}</p> : null}
      </Card>

      <Card title="Moje týmy">
        {teams.length ? (
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <span key={t} className="rounded-full bg-gold/15 px-3 py-1 text-sm font-medium text-gold">
                {t}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Zatím nesleduješ žádný tým. Otevři stránku týmu (např. z <Link href="/liga/cz-elh" className="text-accent">tabulky extraligy</Link>) a klikni na „Sledovat“.
          </p>
        )}
      </Card>

      <Card title="Celé soutěže (všechny zápasy)">
        <div className="flex flex-wrap gap-2">
          {DEFAULT_LEAGUES.map((k) => {
            const on = prefs.leagues.includes(k);
            return (
              <button
                key={k}
                onClick={() => toggleLeague(k)}
                className={`border px-3 py-1 text-sm ${on ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"}`}
              >
                {getLeague(k).shortName}
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Co chci vědět">
        <ul className="grid gap-2 sm:grid-cols-2">
          {TRIGGERS.map((t) => {
            const on = prefs.triggers.includes(t.kind);
            return (
              <li key={t.kind}>
                <button
                  onClick={() => toggleTrigger(t.kind)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${on ? "border-accent bg-accent-soft" : "border-line"}`}
                >
                  <span className={`grid size-5 place-items-center rounded-md border text-[11px] ${on ? "border-accent bg-accent text-white" : "border-line"}`}>{on ? "✓" : ""}</span>
                  <span>
                    <span className="block text-sm font-medium">{t.label}</span>
                    {t.hint ? <span className="block text-xs text-muted">{t.hint}</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Noční klid">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(prefs.quiet)}
              onChange={(e) => update({ ...prefs, quiet: e.target.checked ? { from: 23, to: 7 } : null })}
              className="size-4 accent-[var(--accent)]"
            />
            Nerušit
          </label>
          {prefs.quiet ? (
            <>
              od
              <select value={prefs.quiet.from} onChange={(e) => update({ ...prefs, quiet: { ...prefs.quiet!, from: Number(e.target.value) } })} className="rounded-lg border border-line bg-surface-2 px-2 py-1">
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {h}:00
                  </option>
                ))}
              </select>
              do
              <select value={prefs.quiet.to} onChange={(e) => update({ ...prefs, quiet: { ...prefs.quiet!, to: Number(e.target.value) } })} className="rounded-lg border border-line bg-surface-2 px-2 py-1">
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {h}:00
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted">(NHL v noci pak nepípne)</span>
            </>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
