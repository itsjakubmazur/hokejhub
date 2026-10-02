"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Check,
  ChevronDown,
  ClipboardCopy,
  Crown,
  History,
  ListChecks,
  LogOut,
  MessagesSquare,
  Sparkles,
  Star,
  Trophy,
  Users,
  Wand2,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { saveTip as saveLocalTip, useTips } from "@/lib/tips";
import { ClubLogo } from "../club-logo";
import { Segmented } from "../game/segmented";
import { Card, Empty } from "../ui/card";
import { CS, csCount } from "@hokejhub/core";
import { api, LEAGUE_TAG, pointsCls, type Group, type LeaderRow, type MyTip, type Split, type TipGame, type User } from "./api";
import { BonusQuestions } from "./bonus";
import { CrowdTips, SplitBar } from "./crowd";
import { MyStats } from "./stats";
import { GroupWall } from "./wall";
import { TipsterSheet } from "./tipster";

// ---------- root ----------

type Tab = "tipovat" | "zebricek" | "bonusy" | "moje" | "skupiny";

export function TipApp({ clubs }: { clubs: { id: string; name: string; logo: string | null }[] }) {
  const me = useQuery({ queryKey: ["tip", "me"], queryFn: () => api<{ user: User | null }>("me") });
  const [tab, setTab] = useState<Tab>("tipovat");
  const user = me.data?.user ?? null;

  return (
    <div className="space-y-5">
      <header className="rise relative overflow-hidden bg-board p-5 text-board-text sm:p-7">
        <Trophy className="pointer-events-none absolute -right-6 -top-6 size-48 text-led opacity-[0.07]" aria-hidden />
        <p className="label text-board-muted">Extraliga + NHL</p>
        <h1 className="mt-1 text-board-text">Tipovačka</h1>
        <p className="mt-1.5 max-w-prose text-[13px] leading-snug text-board-muted sm:mt-2 sm:text-sm sm:leading-normal">
          Tipuj přesné skóre po 60 minutách. Přesný výsledek 5 bodů, vítěz i rozdíl 3 body, jen vítěz 2 body. Prodloužení a nájezdy se počítají jako
          remíza. Jednou za hrací den můžeš vsadit žolíka na dvojnásobek bodů. K tomu tipy na celou sezónu, skupiny s kamarády a náš model jako
          soupeř. Tip se uzamkne začátkem zápasu.
        </p>
        {user ? <UserBar user={user} /> : null}
      </header>

      {me.isLoading ? (
        <Card>
          <Empty>Načítám…</Empty>
        </Card>
      ) : (
        <>
          {user ? <ImportLocalTips /> : null}
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "tipovat", label: "Tipovat" },
              { value: "zebricek", label: "Žebříček" },
              { value: "bonusy", label: "Sezóna" },
              { value: "moje", label: "Moje" },
              { value: "skupiny", label: "Skupiny" },
            ]}
          />
          {tab === "tipovat" ? user ? <TipGames /> : <AuthPanel clubs={clubs} /> : null}
          {tab === "zebricek" ? <Leaderboard me={user} /> : null}
          {tab === "bonusy" ? <BonusQuestions loggedIn={Boolean(user)} /> : null}
          {tab === "moje" ? user ? <MyHistory /> : <AuthPanel clubs={clubs} /> : null}
          {tab === "skupiny" ? user ? <Groups /> : <AuthPanel clubs={clubs} /> : null}
        </>
      )}
    </div>
  );
}

function UserBar({ user }: { user: User }) {
  const qc = useQueryClient();
  const out = useMutation({ mutationFn: () => api("logout", { method: "POST" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["tip"] }) });
  return (
    <div className="mt-5 flex items-center gap-3 border-t border-board-line pt-4">
      <span className="grid size-12 place-items-center bg-white p-1.5">
        {user.club_logo ? (
          <ClubLogo src={user.club_logo} alt={user.club_name ?? ""} size={40} />
        ) : (
          <Trophy className="size-6 text-black/50" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="display truncate text-2xl">{user.nickname}</div>
        <div className="text-xs text-board-muted">{user.club_name ? `fanoušek: ${user.club_name}` : "bez oblíbeného klubu"}</div>
      </div>
      <button
        onClick={() => out.mutate()}
        className="flex items-center gap-1.5 border border-board-line px-3 py-1.5 text-xs font-semibold text-board-muted hover:text-board-text"
      >
        <LogOut className="size-3.5" aria-hidden /> Odhlásit
      </button>
    </div>
  );
}

// ---------- auth ----------

function AuthPanel({ clubs }: { clubs: { id: string; name: string; logo: string | null }[] }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [club, setClub] = useState<string | null>(null);
  const submit = useMutation({
    mutationFn: () => api(mode, { method: "POST", body: { nickname, password, clubId: club } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tip"] }),
  });
  return (
    <Card>
      <div className="mx-auto max-w-lg space-y-5">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "register", label: "Nový účet" },
            { value: "login", label: "Přihlásit se" },
          ]}
        />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <label className="block">
            <span className="label text-muted">Přezdívka</span>
            <input
              id="tip-nick"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoComplete="username"
              className="mt-1.5 w-full border border-line bg-surface-2 px-3 py-2.5 text-base outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="label text-muted">Heslo</span>
            <input
              id="tip-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="mt-1.5 w-full border border-line bg-surface-2 px-3 py-2.5 text-base outline-none focus:border-accent"
            />
          </label>
          {mode === "register" ? (
            <div>
              <span className="label text-muted">Oblíbený klub (tvůj avatar)</span>
              <div className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-7">
                {clubs.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    title={c.name}
                    onClick={() => setClub(club === c.id ? null : c.id)}
                    className={`grid aspect-square place-items-center border bg-white p-1.5 transition ${club === c.id ? "border-live ring-2 ring-live" : "border-line opacity-80 hover:opacity-100"}`}
                  >
                    <ClubLogo src={c.logo} alt={c.name} size={40} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {submit.error ? <p className="text-sm text-live">{(submit.error as Error).message}</p> : null}
          <button disabled={submit.isPending} className="w-full bg-fg py-3 text-sm font-bold uppercase tracking-wider text-bg disabled:opacity-50">
            {mode === "register" ? "Založit účet a tipovat" : "Přihlásit"}
          </button>
        </form>
      </div>
    </Card>
  );
}

// ---------- import of pre-account tips ----------

function ImportLocalTips() {
  const local = useTips();
  const qc = useQueryClient();
  const [now] = useState(() => Date.now());
  const pending = Object.values(local).filter((t) => Date.parse(t.startAt) > now);
  const imp = useMutation({
    mutationFn: () =>
      api<{ saved: number }>("tips", { method: "POST", body: { tips: pending.map((t) => ({ gameId: t.gameId, playDate: t.date, ...t.tip })) } }),
    onSuccess: () => {
      for (const t of pending) saveLocalTip({ gameId: t.gameId, remove: true });
      qc.invalidateQueries({ queryKey: ["tip"] });
    },
  });
  if (pending.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 border border-accent/40 bg-accent-soft p-3 text-sm">
      <span className="flex-1">V tomhle prohlížeči máš {csCount(pending.length, CS.tip)} z doby před účty.</span>
      <button onClick={() => imp.mutate()} disabled={imp.isPending} className="bg-accent px-3 py-1.5 font-semibold text-white">
        Přenést do účtu
      </button>
    </div>
  );
}

// ---------- tipping ----------

function TipGames() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["tip", "games"],
    queryFn: () => api<{ games: TipGame[]; tips: Record<string, MyTip>; splits: Record<string, Split> }>("games"),
  });
  const [league, setLeague] = useState<"all" | "cz-elh" | "nhl">("all");
  const [filling, setFilling] = useState<string | null>(null);
  const [fillNote, setFillNote] = useState<string | null>(null);
  const days = useMemo(() => {
    const map = new Map<string, TipGame[]>();
    for (const g of data?.games ?? []) {
      if (league !== "all" && g.league !== league) continue;
      const k = new Date(g.startAt).toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Prague" });
      map.set(k, [...(map.get(k) ?? []), g]);
    }
    return [...map.entries()];
  }, [data, league]);

  /** Kicktipp-style quick fill: every game of the day without a tip gets the model's score. */
  const fillFromModel = async (day: string, games: TipGame[]) => {
    setFilling(day);
    let saved = 0;
    let noModel = 0;
    let failed = 0;
    for (const g of games) {
      if (data?.tips[g.id]) continue;
      if (!g.model) {
        noModel++;
        continue;
      }
      try {
        await api("tip", { method: "POST", body: { gameId: g.id, playDate: g.playDate, home: g.model.home, away: g.model.away } });
        saved++;
      } catch {
        failed++;
      }
    }
    setFilling(null);
    setFillNote(
      [saved ? `doplněno ${csCount(saved, CS.tip)}` : null, noModel ? `${noModel} bez tipu modelu` : null, failed ? `${failed} se nepodařilo uložit` : null]
        .filter(Boolean)
        .join(" · ") || "nic k doplnění",
    );
    qc.invalidateQueries({ queryKey: ["tip", "games"] });
  };

  if (isLoading)
    return (
      <Card>
        <Empty>Načítám zápasy…</Empty>
      </Card>
    );
  return (
    <div className="space-y-4">
      <Segmented
        value={league}
        onChange={setLeague}
        options={[
          { value: "all", label: "Vše" },
          { value: "cz-elh", label: "Extraliga" },
          { value: "nhl", label: "NHL" },
        ]}
      />
      {days.length === 0 ? (
        <Card>
          <Empty>V příštích dnech nejsou zápasy k tipování.</Empty>
        </Card>
      ) : null}
      {days.map(([day, games]) => {
        const open = games.filter((g) => !data?.tips[g.id]);
        const jokerOn = games.find((g) => data?.tips[g.id]?.joker);
        return (
          <section key={day} className="rise border border-line bg-surface">
            <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 pb-2 pt-3">
              <h2 className="label flex-1 first-letter:uppercase">{day}</h2>
              <span className={`flex items-center gap-1 text-[11px] ${jokerOn ? "text-gold" : "text-muted"}`}>
                <Sparkles className="size-3.5" aria-hidden /> {jokerOn ? `žolík: ${jokerOn.home.name}–${jokerOn.away.name}` : "žolík nevsazen"}
              </span>
              {open.length ? (
                <>
                  <span className="text-[11px] font-semibold text-live">{csCount(open.length, CS.zapas)} bez tipu</span>
                  <button
                    onClick={() => fillFromModel(day, games)}
                    disabled={filling !== null}
                    className="flex items-center gap-1 border border-line px-2 py-1 text-[11px] font-semibold hover:border-fg disabled:opacity-50"
                  >
                    <Wand2 className="size-3.5" aria-hidden /> {filling === day ? "doplňuji…" : "doplnit podle modelu"}
                  </button>
                  {fillNote && filling === null ? <span className="text-[11px] text-muted">{fillNote}</span> : null}
                </>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-win">
                  <Check className="size-3.5" aria-hidden /> vše otipováno
                </span>
              )}
            </header>
            <ul className="divide-y divide-line">
              {games.map((g) => {
                const t = data?.tips[g.id] ?? null;
                return <TipRow key={`${g.id}-${t ? `${t.home}:${t.away}` : "x"}`} game={g} initial={t} split={data?.splits[g.id]} />;
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Stepper({ value, onChange, label }: { value: number | null; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        aria-label={`${label} +1`}
        onClick={() => onChange(Math.min(20, (value ?? 0) + 1))}
        className="grid h-7 w-12 place-items-center border border-line text-muted hover:text-fg"
      >
        +
      </button>
      <span className={`display grid h-12 w-12 place-items-center text-4xl tabular ${value === null ? "text-muted/40" : ""}`}>{value ?? "–"}</span>
      <button
        type="button"
        aria-label={`${label} −1`}
        onClick={() => onChange(Math.max(0, (value ?? 0) - 1))}
        className="grid h-7 w-12 place-items-center border border-line text-muted hover:text-fg"
      >
        −
      </button>
    </div>
  );
}

function TipRow({ game, initial, split }: { game: TipGame; initial: MyTip | null; split: Split | undefined }) {
  const qc = useQueryClient();
  const [h, setH] = useState<number | null>(initial?.home ?? null);
  const [a, setA] = useState<number | null>(initial?.away ?? null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(initial ? "saved" : "idle");
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [joker, setJoker] = useState(initial?.joker ?? false);
  const jokerMut = useMutation({
    mutationFn: (on: boolean) => api("joker", { method: "POST", body: { gameId: game.id, on } }),
    onMutate: (on) => setJoker(on),
    onError: (e) => {
      setJoker(!joker);
      setErr((e as Error).message);
      setStatus("error");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tip", "games"] }),
  });
  const time = new Date(game.startAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague" });

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const push = (nh: number | null, na: number | null) => {
    if (nh === null || na === null) return;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await api("tip", { method: "POST", body: { gameId: game.id, playDate: game.playDate, home: nh, away: na } });
        setStatus("saved");
        setErr(null);
        qc.invalidateQueries({ queryKey: ["tip", "history"] });
      } catch (e) {
        setStatus("error");
        setErr((e as Error).message);
      }
    }, 450);
  };
  const setHome = (v: number) => {
    const na = a ?? 0;
    setH(v);
    setA(na);
    push(v, na);
  };
  const setAway = (v: number) => {
    const nh = h ?? 0;
    setA(v);
    setH(nh);
    push(nh, v);
  };

  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3 sm:gap-4 sm:px-4">
      <div className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-end sm:text-right">
        <span className="order-2 min-w-0 truncate font-semibold sm:order-1">{game.home.name}</span>
        <span className="order-1 grid size-12 shrink-0 place-items-center bg-white p-1 sm:order-2">
          <ClubLogo src={game.home.logo} alt={game.home.name} size={40} />
        </span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] font-semibold text-muted tabular">
          {LEAGUE_TAG[game.league] ?? game.leagueName} · {time}
        </span>
        <div className="flex items-center gap-1.5">
          <Stepper value={h} onChange={setHome} label={game.home.name} />
          <span className="display text-2xl text-muted">:</span>
          <Stepper value={a} onChange={setAway} label={game.away.name} />
        </div>
        <span className="flex h-4 items-center gap-1 text-[11px]">
          {status === "saving" ? <span className="text-muted">ukládám…</span> : null}
          {status === "saved" ? (
            <span className="flex items-center gap-1 text-win">
              <Check className="size-3" aria-hidden /> uloženo
            </span>
          ) : null}
          {status === "error" ? <span className="text-live">{err}</span> : null}
          {status === "idle" && game.model ? (
            <span className="flex items-center gap-1 text-muted">
              <Bot className="size-3" aria-hidden /> model {game.model.home}:{game.model.away}
            </span>
          ) : null}
        </span>
        {h !== null && a !== null && status !== "saving" ? (
          <motion.button
            type="button"
            onClick={() => jokerMut.mutate(!joker)}
            whileTap={{ scale: 0.9, rotate: -8 }}
            animate={joker ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
              joker ? "bg-gold text-black shadow-[0_0_14px_var(--gold)]" : "border border-line text-muted hover:text-fg"
            }`}
            title="Žolík: dvojnásobek bodů, jeden na hrací den"
          >
            <Sparkles className="size-3" aria-hidden /> {joker ? "žolík ×2" : "žolík"}
          </motion.button>
        ) : null}
        <SplitBar split={split} className="w-32" />
      </div>
      <div className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
        <span className="grid size-12 shrink-0 place-items-center bg-white p-1">
          <ClubLogo src={game.away.logo} alt={game.away.name} size={40} />
        </span>
        <span className="min-w-0 truncate font-semibold">{game.away.name}</span>
      </div>
      {game.tips?.length ? (
        <ul className="col-span-3 flex flex-wrap justify-center gap-1 text-[11px] text-muted" aria-label="Tipy modelu">
          {game.tips.map((t) => (
            <li key={t.label} className="border border-line px-1.5 py-0.5">
              {t.label} <span className="tabular">{Math.round(t.p * 100)} %</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

// ---------- leaderboard ----------

function Leaderboard({ me }: { me: User | null }) {
  const groups = useQuery({ queryKey: ["tip", "groups"], queryFn: () => api<{ groups: Group[] }>("groups") });
  const [group, setGroup] = useState("");
  const [period, setPeriod] = useState<"all" | "30" | "7">("all");
  const board = useQuery({
    queryKey: ["tip", "leaderboard", group, period],
    queryFn: () =>
      api<{
        rows: LeaderRow[];
        model: { points: number; tips: number; exact: number };
        dayWinners: { play_date: string; nickname: string; club_logo: string | null; points: number }[];
      }>(`leaderboard?period=${period}${group ? `&group=${group}` : ""}`),
  });
  const rows = board.data?.rows ?? [];
  const model = board.data?.model;
  const winners = board.data?.dayWinners ?? [];
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <TipsterSheet userId={open} onClose={() => setOpen(null)} />
      {winners.length ? (
        <div className="rise flex gap-2 overflow-x-auto pb-1">
          {winners.map((w) => (
            <div key={w.play_date + w.nickname} className="flex min-w-44 items-center gap-2.5 bg-board px-3 py-2 text-board-text">
              <Star className="size-4 shrink-0 text-gold" aria-hidden />
              <ClubLogo src={w.club_logo} alt="" size={26} />
              <div className="min-w-0">
                <div className="label text-[10px] text-board-muted">
                  Tipér dne {new Date(w.play_date).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}
                </div>
                <div className="truncate text-sm font-bold">
                  {w.nickname} <span className="text-led">{w.points}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <Card title="Žebříček" icon={Crown} action={rows.length ? <span className="text-xs text-muted">{csCount(rows.length, CS.hrac)}</span> : undefined}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { value: "all", label: "Celkem" },
              { value: "30", label: "30 dní" },
              { value: "7", label: "7 dní" },
            ]}
          />
          {groups.data?.groups.length ? (
            <select
              id="tip-group"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="border border-line bg-surface-2 px-2.5 py-1.5 text-sm"
            >
              <option value="">Všichni hráči</option>
              {groups.data.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {board.isLoading ? <Empty>Načítám…</Empty> : rows.length === 0 ? <Empty>V tomhle období zatím nikdo nebodoval.</Empty> : null}
        {rows.length ? (
          <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[560px] text-sm tabular">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="w-10 py-2 text-left font-medium">#</th>
                  <th className="py-2 text-left font-medium">Hráč</th>
                  <th className="text-right font-medium">Body</th>
                  <th className="text-right font-medium" title="Vyhodnocené tipy">
                    Tipů
                  </th>
                  <th className="text-right font-medium" title="Přesné výsledky">
                    Přesně
                  </th>
                  <th className="text-right font-medium" title="Uhodnutý vítěz">
                    Vítěz
                  </th>
                  <th className="text-right font-medium" title="Vyhodnocení žolíci">
                    Žolíci
                  </th>
                  <th className="pr-1 text-right font-medium" title="Body za sezónní otázky">
                    Bonus
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r, i) => (
                  <motion.tr
                    key={r.user_id}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i, 12) * 0.03 }}
                    onClick={() => setOpen(r.user_id)}
                    className={`cursor-pointer hover:bg-surface-2 ${r.user_id === me?.id ? "bg-accent-soft" : ""}`}
                  >
                    <td className={`display py-2 text-xl ${i === 0 ? "text-gold" : i < 3 ? "text-fg" : "text-muted"}`}>{i + 1}.</td>
                    <td className="py-2">
                      <span className="flex items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center bg-white p-0.5">
                          {r.club_logo ? <ClubLogo src={r.club_logo} alt="" size={32} /> : <Trophy className="size-4 text-black/40" aria-hidden />}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(r.user_id);
                          }}
                          className="font-semibold underline-offset-2 hover:text-accent hover:underline"
                        >
                          {r.nickname}
                        </button>
                        {i === 0 ? <Crown className="size-4 text-gold" aria-label="lídr" /> : null}
                      </span>
                    </td>
                    <td className="display text-right text-2xl">{r.points}</td>
                    <td className="text-right">{r.tips}</td>
                    <td className="text-right">{r.exact}</td>
                    <td className="text-right">{r.tips ? `${Math.round((r.winners / r.tips) * 100)} %` : "–"}</td>
                    <td className="text-right">{r.jokers}</td>
                    <td className="pr-1 text-right text-muted">{r.bonus || "–"}</td>
                  </motion.tr>
                ))}
                {model ? (
                  <tr className="border-t-2 border-line">
                    <td className="py-2 text-muted">
                      <Bot className="size-5" aria-hidden />
                    </td>
                    <td className="py-2 font-semibold">Model HokejHub</td>
                    <td className="display text-right text-2xl">{model.points}</td>
                    <td className="text-right">{model.tips}</td>
                    <td className="text-right">{model.exact}</td>
                    <td className="text-right text-muted">–</td>
                    <td className="text-right text-muted">–</td>
                    <td className="pr-1 text-right text-muted">–</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="mt-3 text-[11px] text-muted">
          Klepnutím na tipéra zobrazíš jeho tipy a statistiky. Při shodě bodů rozhoduje počet přesných tipů, pak uhodnutých vítězů, pak méně
          tipů.
        </p>
      </Card>
    </div>
  );
}

// ---------- history ----------

function MyHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ["tip", "history"],
    queryFn: () =>
      api<{
        history: {
          game_id: string;
          start_at: string;
          home_name: string;
          away_name: string;
          home_logo: string | null;
          away_logo: string | null;
          home: number;
          away: number;
          model_home: number | null;
          model_away: number | null;
          home_score: number | null;
          away_score: number | null;
          decided_in: string | null;
          points: number | null;
          model_points: number | null;
          joker: boolean;
        }[];
      }>("history"),
  });
  const [open, setOpen] = useState<string | null>(null);
  const list = data?.history ?? [];
  const mine = list.reduce((s, r) => s + (r.points ?? 0), 0);
  const bot = list.reduce((s, r) => s + (r.model_points ?? 0), 0);
  return (
    <div className="space-y-4">
      <MyStats />
      <Card title="Moje tipy" icon={History}>
        {isLoading ? <Empty>Načítám…</Empty> : list.length === 0 ? <Empty>Zatím žádné tipy.</Empty> : null}
        {list.length ? (
          <>
            <p className="mb-3 text-sm">
              Ty <b className="display text-xl">{mine}</b> b. · model <b className="display text-xl">{bot}</b> b. na stejných zápasech
            </p>
            <ul className="divide-y divide-line">
              {list.map((r) => (
                <li key={r.game_id}>
                  <button
                    type="button"
                    onClick={() => setOpen(open === r.game_id ? null : r.game_id)}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-3 py-2.5 text-left sm:grid-cols-[70px_1fr_auto_auto_auto_16px]"
                  >
                    <span className="hidden text-xs text-muted tabular sm:block">
                      {new Date(r.start_at).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", timeZone: "Europe/Prague" })}
                    </span>
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <ClubLogo src={r.home_logo} alt="" size={26} />
                      <span className="truncate">
                        {r.home_name} – {r.away_name}
                      </span>
                      <ClubLogo src={r.away_logo} alt="" size={26} />
                    </span>
                    <span className="display text-right text-xl tabular">
                      {r.home_score !== null
                        ? `${r.home_score}:${r.away_score}${r.decided_in === "OT" ? " pp" : r.decided_in === "SO" ? " sn" : ""}`
                        : "–"}
                    </span>
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 text-center text-xs font-semibold tabular ${pointsCls(r.points, r.joker)}`}
                      title="Tvůj tip"
                    >
                      {r.joker ? <Sparkles className="size-3" aria-label="žolík" /> : null}
                      {r.home}:{r.away}
                      {r.points !== null ? ` · ${r.points} b.` : ""}
                    </span>
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 text-center text-xs tabular ${pointsCls(r.model_points)}`}
                      title="Tip modelu"
                    >
                      <Bot className="size-3" aria-hidden />
                      {r.model_home !== null ? `${r.model_home}:${r.model_away}` : "–"}
                      {r.model_points !== null ? ` · ${r.model_points}` : ""}
                    </span>
                    <ChevronDown
                      className={`hidden size-4 text-muted transition-transform sm:block ${open === r.game_id ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  {open === r.game_id ? <CrowdTips gameId={r.game_id} group="" /> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Card>
    </div>
  );
}

// ---------- groups ----------

function Groups() {
  const qc = useQueryClient();
  const groups = useQuery({ queryKey: ["tip", "groups"], queryFn: () => api<{ groups: Group[] }>("groups") });
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [wall, setWall] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: () => api<{ code: string }>("group", { method: "POST", body: { name } }),
    onSuccess: (r) => {
      setMsg(`Skupina založena. Pošli kamarádům kód ${r.code}.`);
      setName("");
      qc.invalidateQueries({ queryKey: ["tip", "groups"] });
    },
    onError: (e) => setMsg((e as Error).message),
  });
  const join = useMutation({
    mutationFn: () => api<{ name: string }>("join", { method: "POST", body: { code } }),
    onSuccess: (r) => {
      setMsg(`Jsi ve skupině ${r.name}.`);
      setCode("");
      qc.invalidateQueries({ queryKey: ["tip", "groups"] });
    },
    onError: (e) => setMsg((e as Error).message),
  });
  return (
    <div className="space-y-4">
      <Card title="Moje skupiny" icon={Users}>
        {groups.data?.groups.length ? (
          <ul className="divide-y divide-line">
            {groups.data.groups.map((g) => (
              <li key={g.id} className="py-2.5">
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{g.name}</span>
                    <span className="text-xs text-muted">
                      {csCount(g.members, CS.hrac)}
                      {g.owner ? " · zakladatel" : ""}
                    </span>
                  </span>
                  <button
                    onClick={() => setWall(wall === g.id ? null : g.id)}
                    className={`flex items-center gap-1.5 border px-3 py-1.5 text-sm ${wall === g.id ? "border-fg" : "border-line hover:border-fg"}`}
                  >
                    <MessagesSquare className="size-4" aria-hidden /> Kabina
                  </button>
                  <CopyCode code={g.code} />
                </div>
                {wall === g.id ? <GroupWall group={g.id} /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Zatím nejsi v žádné skupině.</Empty>
        )}
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Založit skupinu" icon={ListChecks}>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <input
              id="tip-group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Název, třeba Kancelář"
              className="min-w-0 flex-1 border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button className="bg-fg px-4 text-sm font-semibold text-bg">Založit</button>
          </form>
        </Card>
        <Card title="Přidat se kódem" icon={Users}>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              join.mutate();
            }}
          >
            <input
              id="tip-group-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Kód skupiny"
              className="min-w-0 flex-1 border border-line bg-surface-2 px-3 py-2 text-sm uppercase tracking-widest outline-none focus:border-accent"
            />
            <button className="bg-fg px-4 text-sm font-semibold text-bg">Přidat se</button>
          </form>
        </Card>
      </div>
      {msg ? <p className="text-sm text-muted">{msg}</p> : null}
    </div>
  );
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable: the code is visible anyway */
        }
      }}
      className="flex items-center gap-2 border border-line px-3 py-1.5 font-mono text-sm tracking-widest hover:border-fg"
      title="Zkopírovat kód"
    >
      {code}
      {copied ? <Check className="size-3.5 text-win" aria-hidden /> : <ClipboardCopy className="size-3.5 text-muted" aria-hidden />}
    </button>
  );
}
