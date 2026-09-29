# HokejHub — Fáze 0: rešerše

Stav k 29. 9. 2026. Položky označené **✅ ověřeno** jsem dnes otestoval přímo HTTP požadavkem (z cloudového kontejneru, tj. datacentrová IP). Ostatní vychází z veřejně známých informací a je potřeba je ověřit při implementaci (**⚠️ neověřeno**).

---

## 0. TL;DR — nejdůležitější zjištění

1. **eSports/onlajny JSON funguje a má otevřený CORS** (`Access-Control-Allow-Origin: *`) — scoreboard, živé kurzy i rozložení sázek. ✅
2. **Historie scoreboardu je mělká:** `json.esports.cz/.../scoreboard/onlajny/{date}.json` vrací data jen **cca od 20. 2. 2025** (starší data → 404; dny bez zápasů také 404). „Víc sezón zpátky" pro české ligy z tohoto zdroje nedostaneme. ✅
   → Historie ČR: (a) od teď archivovat vlastním ingestem, (b) backfill z hokej.cz HTML (pokud bude ze serveru dostupné), (c) ruční import veřejných CSV/tabulek pro starší sezóny (jen výsledky + tabulky).
3. **hokej.cz vrací 403 (nginx) na všechno včetně `robots.txt`** z datacentrové IP, i s běžným User-Agentem. ✅ Jde o blokaci IP/botů — **nebudeme ji obcházet** (žádné rezidenční proxy, spoofing). Nutné otestovat z Vercelu/Supabase Edge; pokud bude blokováno i tam, box score ELH z hokej.cz **nebude**, a navrhuji požádat hokej.cz/eSports o souhlas / partnerský feed. Detailní box score je pro MVP „nice to have", ne blocker.
4. **NHL `api-web.nhle.com` nevrací CORS hlavičky** ✅ → volat serverově. Odpovědi mají `cache-control: max-age≈10–20 s` → přirozená kadence pollingu. `*/now` endpointy vrací 307 redirect na datum.
5. **NHL play-by-play obsahuje `xCoord/yCoord`, `shotType`, `situationCode`, `goalieInNetId`** ✅ → vlastní xG model je plně proveditelný.
6. **NHL sezóna 2026/27 začíná dnes** (`2026020001`, 29. 9. 2026) ✅ — ideální čas začít archivovat.
7. **MoneyPuck data: „free for non-commercial use", povinná atribuce, scraping mimo stránku dat zakázán** ✅ — CSV stahovat dávkově (1× denně), nic víc.
8. **Scoreboard obsahuje i NHL a desítky českých soutěží** (ELH=16, Maxa liga=20, 2. liga=3470, Extraliga žen=3458, junioři=33, dorost=3465, …, „Příprava NHL"=2752) ✅. Ligy jsou klíčovány ID — potřebujeme mapovací tabulku ID → naše `league`.
9. **Rozložení sázek (`ticket-analysis`) funguje i pro ELH** ✅ (`procenta`, `kurz_soucasny/predchozi`, `posun`, `pocet_tiketu`, `nejsazenejsi_tipy`), klíč = `onlajny_id`; pro zápasy bez analýzy 404.
10. **Live kurzy** `tipsport-live.json` ✅ obsahují jen aktuálně živé zápasy (dnes odpoledne 13) — historii pohybu musíme **snapshotovat sami** při ingestu.

---

## 1. Konkurence — co nabízí a co si vzít

| Služba | Pokrytí | Statistiky | Live / historie | xG / pokročilé | Cena | Data / API | Co si vzít |
|---|---|---|---|---|---|---|---|
| **hokej.cz** (ČSLH) | ELH, Maxa, 2. liga, ženy, mládež, repre | Oficiální box score (TOI, PP/SH, +/−, hity, bloky, FO %, Radegast index), tabulky, statistiky hráčů | Live i archiv | Ne | Zdarma | Bez veřejného API; HTML bez CORS; z DC IP 403 | Hloubka českých dat, box score layout |
| **onlajny.com / eSports.cz** | ČR/SK, NHL, KHL, … | Skóre, text. přenos, sestavy, kurzy, rozložení sázek | Live (Lightstreamer push) | Ne | Zdarma | JSON na S3 (CORS \*), live eventy jen přes Lightstreamer | Kurzy + „chytré peníze", šíře soutěží |
| **Livesport / Flashscore** | Globální | Skóre, sestavy, H2H, tabulky, forma | Nejrychlejší live | Omezeně | Zdarma (reklama) | Chráněné `x-fsign` — **nepoužívat** | UX: rychlost, notifikace, H2H, forma (5 posledních) |
| **NHL.com / NHL app** | NHL | Oficiální box, pbp, NHL EDGE (rychlost bruslení, střel, zóny) | Live + archiv od 1917 | EDGE tracking, ne xG | Zdarma | `api-web.nhle.com`, `api.nhle.com/stats/rest` (neoficiální, bez klíče) | Game center, EDGE vizualizace, videa gólů (odkazy) |
| **ESPN NHL** | NHL | Box, pbp, win probability (u některých sportů) | Live + archiv | Win prob | Zdarma | Neoficiální API | Win-prob graf, gamecast |
| **MoneyPuck** | NHL | xG (shot-level), Corsi/Fenwick, deserve-to-win, playoff odds, live win prob | Live + od 2008 | ✅ Špička | Zdarma (nekomerční) | CSV ke stažení | xG metodika, „Deserve to win o'meter", playoff šance |
| **Natural Stat Trick** | NHL (+ některé další) | On-ice 5v5, lines, xG, HD šance | Téměř live + archiv | ✅ | Zdarma / Patreon | Bez API, scraping nežádoucí | Line combos, situace (5v5/PP/PK) filtry |
| **Evolving-Hockey** | NHL | GAR/WAR, RAPM, xG, kontrakty | Archiv | ✅ Nejhlubší | Placené (~5 USD/měs) | Bez API | Koncept WAR/RAPM (pro v2030) |
| **HockeyViz** (Micah McCurdy) | NHL | Heatmapy, isolated impact, predikce | Archiv + predikce | ✅ | Placené | Bez API | Vizuální jazyk heatmap |
| **Elite Prospects** | Celosvětově (i ČR mládež) | Kariéry, soupisky, draft, přestupy | Archiv | Ne | Freemium | Placené API (B2B) | Kariérní tabulka, přestupy, ligy |
| **CapFriendly → PuckPedia / Spotrac** | NHL kontrakty | Platy, cap space | — | — | Zdarma/freemium | Bez API | CapFriendly ukončen 2024 (koupen Washingtonem); platy jen jako odkaz |
| **Dobber Hockey** | NHL fantasy | Line combos, projekce, zranění | Denně | Ne | Freemium | Bez API | Line combos, fantasy projekce |
| **QuantHockey** | NHL + evropské ligy historicky | Historické rekordy, tabulky | Archiv | Ne | Zdarma | Bez API | Síň rekordů, „na tento den" |
| **hokejportal.net / hokej.sk** | SK/ČR | Zprávy, výsledky | Live + archiv | Ne | Zdarma | Bez API | Zpravodajský feed |
| **Sofascore** | Globální | Rating hráčů, momentum graf | Live | Pseudo-rating | Zdarma | Chráněné, nepoužívat | **Momentum graf** a hodnocení hráčů |

**Mezera na trhu (kde vyhrajeme):** nikdo nespojuje (1) české ligy + NHL na jednom místě, (2) model vs. trh (kurzy + chytré peníze + vlastní pravděpodobnost), (3) plně konfigurovatelné push notifikace, (4) moderní „2030" UI s xG/win-prob grafy i pro fanouška, který nečte Natural Stat Trick.

---

## 2. Datové zdroje a API

### 2.1 České ligy (eSports.cz / onlajny.com)

| Data | Endpoint | Formát | Auth | CORS | Poznámka |
|---|---|---|---|---|---|
| Scoreboard dne (všechny ligy vč. NHL) | `https://json.esports.cz/hokejcz/scoreboard/onlajny/{YYYY-MM-DD}.json` | JSON `{ligaId: {league_name, matches[]}}` | ne | `*` ✅ | Historie od ~2025-02-20; budoucí dny OK (rozpis); prázdný den = 404 |
| Předzápasové kurzy | v scoreboardu `bets.tipsport` (1/0/2 + odkazy) | JSON | ne | `*` | Odkazy obsahují affiliate parametry → **nepoužívat jejich tid**, vést na čistý odkaz nebo bez odkazu |
| Živé kurzy | `https://s3.eu-west-1.amazonaws.com/data.onlajny.com/odds/tipsport-live.json` | `{matches:{onlajny_id:{home_win,draw,away_win,…}}}` | ne | `*` ✅ | Jen živé zápasy; `Last-Modified` pro podmíněné GET |
| Rozložení sázek | `https://s3-eu-west-1.amazonaws.com/data.onlajny.com/hockey/ticket-analysis/{rok}/{onlajny_id}.json` | JSON (`rozlozeni_vkladu`, `nejsazenejsi_tipy`) | ne | `*` ✅ | Funguje pro ELH i NHL; 404 = žádná analýza |
| Loga | `https://s3-eu-west-1.amazonaws.com/onlajny/team/logo/{logo_id}` | obrázek | ne | — | ✅ 200; cachovat přes Next Image / vlastní CDN |
| Box score hráčů | `https://www.hokej.cz/zapas/{hokejcz_id}/` | HTML | ne | ❌ | **403 z DC IP** ✅; parsovat jen serverově a jen pokud to server povolí |
| Live eventy, souřadnice střel | Lightstreamer `push.www.onlajny.com` | push | session | — | Neveřejné rozhraní → **nepoužívat bez souhlasu** |
| Tabulky, statistiky hráčů | hokej.cz HTML | HTML | ne | ❌ | Stejné omezení jako box score. **Fallback: tabulky počítat sami ze scoreboardu** (3-2-1-0 body) |

**Pole zápasu ve scoreboardu:** `hokejcz_id` (0 u NHL), `onlajny_id`, `date`, `time`, `home/visitor{onlajny_id, hokejcz_id, name, short_name, shortcut, logo_id}`, `score_home/visitor` (string), `score_period[]` (`"1:1"`), `match_last_time` (`"66'"`), `match_actual_time_alias` (`K`, `KN`, …), `match_actual_time_name`, `match_status` (`"po zápase"`, …), `series`, `bets{tipsport, sazkabet}`.

Ligy (ID z dat 27. 9. 2026): `16` ELH, `20` Maxa liga, `3470` 2. liga, `3458` Extraliga žen, `3456` 1. liga žen, `33` extraliga juniorů, `36` liga juniorů, `3465` liga dorostu, `35` extraliga mladšího dorostu, `2752` příprava NHL, `NHL` (název „NHL" v sezóně), krajské ligy `1392–1396, 3462, 3819–3821`, … — úplný seznam budeme sbírat ingestem do tabulky `source_league`.

**robots.txt onlajny.com:** `Crawl-delay: 10`, zakázány jen `/partner/click/`, `/bet/click/`. S3 JSON je statický obsah pro jejich vlastní frontend — budeme se chovat slušně: serverová cache, ≤ 1 req / 20 s na soubor během živých zápasů, jinak ≤ 1 / 5 min, atribuce „Data: eSports.cz / onlajny.com, kurzy Tipsport".

### 2.1a Doplnění (29. 9. 2026 odpoledne)

- **Varianta scoreboardu** `https://json.esports.cz/hokejcz/scoreboard/{YYYY-MM-DD}.json` ✅ — jen ELH, jiná ID lig (`101` = ELH, v onlajny variantě `101` = NHL!), datum uvnitř `DD-MM-YYYY`, `score_periods` místo `score_period`, týmy mají `hokejcz_id`. Historie stejně mělká (starší data → 404). Používáme ji jen jako **fallback**, když hlavní `onlajny` varianta selže; ligy mapujeme podle názvu.
- **404 = den bez zápasů** (nebo zatím nenalosováno), ne chyba. Ošetřeno (`state: "empty"`).
- **Retry s backoffem** (400 ms, 1,2 s) na síťové chyby/5xx/429, cache poslední dobré odpovědi, stav „zpožděno/nedostupné" v UI, polling 20 s živě.
- **Historie ČR z hokej.cz:** sezónní stránky soutěží (od 1993/94, extraliga = `competition=4171`) a `/historie` (od 1936). HTML bez CORS; parsovat serverově / v ingestu. Klíč `hokejcz_id` ze scoreboardu = prolink na `hokej.cz/zapas/{id}/` (box score).

### 2.1b Blokace datacenter a „klientský" fetch

Tip z badmintonové appky (tahat data až v prohlížeči uživatele) funguje **jen u zdrojů, které posílají CORS hlavičky** — prohlížeč jinak odpověď z cizí domény JS kódu nevydá (to je jiné omezení než blokace IP).

| Zdroj | CORS | Z prohlížeče? | Z datacentra? |
|---|---|---|---|
| eSports / onlajny JSON (scoreboard, kurzy, ticket-analysis) | `*` ✅ | ✅ | ✅ |
| api-web.nhle.com | ❌ | ❌ | ✅ |
| hokej.cz HTML | ❌ | ❌ | ❌ (403, ověřit z Vercelu) |

Z toho plyne:
- **eSports:** primárně serverově (ingest → DB → naše API); když náš server selže, **PWA si scoreboard a živé kurzy stáhne přímo v prohlížeči** (implementováno jako fallback).
- **NHL:** jen serverově (bez CORS, ale datacentra neblokuje).
- **hokej.cz:** pokud blokuje i Vercel, prohlížeč nepomůže (chybí CORS). Řešení bez obcházení čehokoli: **ingest skript spouštěný z tvé vlastní sítě** (tvůj počítač / Raspberry Pi doma, `pnpm ingest:hokejcz`), který stránky stáhne běžnou rychlostí jako návštěvník a výsledek zapíše do Supabase. Na historii (jednorázový backfill 1993→) ideální; pro živé box score by stačil cron na domácím stroji.

### 2.2 NHL

| Data | Endpoint | Pozn. |
|---|---|---|
| Skóre dne | `api-web.nhle.com/v1/score/{date}` (`/now` → 307) ✅ | obsahuje i `odds` (vč. Tipsport, providerId 3?) |
| Scoreboard | `/v1/scoreboard/now` | |
| Rozpis | `/v1/schedule/{date}`, `/v1/club-schedule-season/{team}/now` | |
| Game center | `/v1/gamecenter/{id}/landing`, `/boxscore`, `/play-by-play`, `/right-rail` ✅ | pbp: `xCoord,yCoord,zoneCode,shotType,situationCode,homeTeamDefendingSide` |
| Hráč | `/v1/player/{id}/landing`, `/game-log/{season}/{type}` | |
| Tabulky | `/v1/standings/now`, `/v1/standings/{date}` ✅ | historické tabulky k datu |
| Soupisky | `/v1/roster/{team}/current`, `/{season}` | |
| NHL EDGE | `/v1/edge/...` (307 ✅, formát ⚠️ neověřen) | rychlosti bruslení/střel |
| Kurzy partnera | `/v1/partner-game/CZ/now` ✅ | Tipsport kurzy na NHL |
| Agregace | `api.nhle.com/stats/rest/en/{team,skater,goalie}/summary?cayenneExp=…` ✅ | historie po sezónách |

- Auth žádná, **bez CORS** ✅, `cache-control max-age 9–20 s`. Neoficiální → API se může měnit bez ohlášení; ToS NHL.com zakazuje komerční využití. Pro osobní/informační appku OK s atribucí „Data © NHL".
- Dokumentace: GitHub `Zmalski/NHL-API-Reference`.
- Historie: NHL pbp se souřadnicemi existuje zhruba od 2010/11 → backfill dávkově (≈1 300 zápasů/sezónu, 1 req/s ⇒ ~25 min/sezónu).

### 2.3 xG a pokročilé metriky

- **MoneyPuck** ✅: sezónní CSV (skaters/goalies/lines/teams) + shot-level `shots_{year}.zip`; licence nekomerční s atribucí. Použití: (1) hotové xG hráčů/týmů pro NHL, (2) **validace našeho modelu** (korelace našich per-shot xG s jejich).
- **Vlastní NHL xG** (doporučuji): logistická regrese / gradient boosting nad pbp: vzdálenost, úhel, typ střely, rebound (≤3 s od předchozí střely), rush (událost v jiné zóně ≤4 s), strength state (`situationCode`), empty net, skóre, čas, back-hand/off-wing. Trénink v Pythonu offline (sezóny 2015–2026), export koeficientů / stromů do JSON, skórování v TS při ingestu. Cíl: log-loss/AUC srovnatelné s MoneyPuck (AUC ~0,77).
- **České ligy:** souřadnice střel veřejně nejsou (jen Lightstreamer). Proveditelné je:
  - **„xG-lite"** z box score (střely, PP čas, góly) → **není** skutečné xG; zobrazit jako „kvalita šancí (odhad)" s disclaimerem, nebo vynechat.
  - Týmový model síly (Elo + góly + střely, pokud box score dostupné) → predikce funguje i bez xG.
  - Požádat eSports/ČSLH o přístup k datům střel (partnerství) → jediná legální cesta k ELH xG.

### 2.4 Ostatní ligy (příprava na později)
- **SHL, Liiga, DEL, KHL, IIHF, CHL:** eSports scoreboard v sezóně často obsahuje i KHL/IIHF/CHL (ověřit ID). Oficiální webové JSON Liigy (`liiga.fi/api`) a SHL existují ⚠️ neověřeno. Architektura: adaptér na zdroj → normalizovaný model.

### 2.5 Nepoužívat
- Livesport/Flashscore (`x-fsign`), Sofascore (chráněné API), onlajny Lightstreamer bez souhlasu, NST/Evolving-Hockey/HockeyViz scraping, jakákoli rezidenční proxy nebo obcházení 403 na hokej.cz.

---

## 3. Predikce — návrh modelů

| Model | Vstup | Výstup | Kde |
|---|---|---|---|
| **Elo (goal-based, MoV)** per liga | výsledky (scoreboard, NHL) | pregame P(výhra doma/remíza v 60'/hosté), P(výhra po rozhodnutí) | TS, při ingestu |
| **Poisson / Skellam** | síla útoku/obrany (Elo → λ), domácí výhoda | očekávané skóre, P(přesný výsledek), over/under | TS |
| **Live win probability** | skóre, čas, strength state (NHL přes `situationCode`, ELH přes tresty pokud dostupné), pregame λ | P(výhra) v čase → graf momenta | TS; Poisson zbývajícího času + prodloužení |
| **xG (NHL)** | pbp | per-shot xG, týmové/hráčské xG, xPoints tabulka | Python trénink → JSON → TS inference |
| **Model vs. trh** | naše P vs. 1/kurz s odstraněnou marží (proporcionálně / Shin) | edge %, value flag | TS |
| **Backtesting** | uložené predikce + výsledky | log-loss, Brier, kalibrační graf, ROI vs. trh | SQL view + stránka |

Elo na ELH lze natrénovat hned od 2025-02 (data ze scoreboardu) a rozšířit backfillem.

---

## 4. Feature scan

Priorita: **P0** = MVP, **P1** = v1, **P2** = „2030".

| Funkce | Kdo to má | Chceme? | Priorita |
|---|---|---|---|
| Live scoreboard všech lig | hokej.cz, onlajny, Flashscore, NHL app | ✅ | P0 |
| Filtr lig + „jen oblíbené" | Flashscore | ✅ | P0 |
| Game center: skóre, třetiny, čas, stav | všichni | ✅ | P0 |
| Předzápasové + živé kurzy, pohyb kurzu | onlajny | ✅ | P0 |
| Rozložení sázek / chytré peníze | onlajny | ✅ | P0 |
| Varování 18+ / MFČR u kurzů | hokej.cz | ✅ povinně | P0 |
| PWA instalace, offline cache | — | ✅ | P0 |
| Dark/light, skeletony | Flashscore, NHL | ✅ | P0 |
| NHL play-by-play, box score | NHL, ESPN | ✅ | P0 |
| Tabulky (ELH počítaná, NHL oficiální) | všichni | ✅ | P1 (NHL P0) |
| Multi-view více zápasů | NHL app (částečně) | ✅ | P1 |
| Shot mapa (NHL) | NHL, NST, MoneyPuck | ✅ | P1 |
| xG průběh zápasu (NHL) | MoneyPuck | ✅ | P1 |
| Live win probability + momentum graf | ESPN, MoneyPuck, Sofascore | ✅ | P1 |
| Předzápasová predikce (Elo) | MoneyPuck, 538 (historicky) | ✅ | P1 |
| Model vs. trh, value tipy | nikdo z fanouškovských | ✅ unikátní | P1 |
| Push notifikace (pravidla) | Flashscore (jednoduché), NHL app | ✅ pokročilé | P1 |
| Tiché hodiny, per-liga filtry | Flashscore | ✅ | P1 |
| Box score ELH (TOI, hity, FO…) | hokej.cz | ✅ jen pokud legálně dostupné | P1 (riziko) |
| Sestavy / formace | hokej.cz, Dobber | ✅ | P1 (NHL), ELH ⚠️ |
| Archiv zápasů, H2H | Flashscore, hokej.cz | ✅ | P1 |
| Forma (posledních 5), série | Flashscore | ✅ | P1 |
| Oblíbené → personalizovaný feed | NHL app | ✅ | P1 |
| Fulltext vyhledávání | Elite Prospects | ✅ (Postgres FTS + trigram) | P1 |
| Playoff pavouk | NHL, hokej.cz | ✅ | P1 |
| Kariérní statistiky hráčů | EP, NHL | ✅ NHL; ELH jen z našeho archivu | P1/P2 |
| Očekávaná tabulka (xPoints) | MoneyPuck (deserve-to-win) | ✅ | P2 |
| Playoff šance (Monte Carlo) | MoneyPuck, HockeyViz | ✅ | P2 |
| Tabulky v čase (graf pozic) | — | ✅ | P2 |
| Backtesting + kalibrace | — | ✅ | P2 |
| LLM souhrny zápasů | NHL (částečně) | ✅ | P2 |
| Sdílecí karty (OG image) | Sofascore | ✅ (`next/og`) | P2 |
| Porovnání hráčů/týmů | NST, HockeyViz | ✅ | P2 |
| Síň rekordů, „na tento den" | QuantHockey | ✅ | P2 |
| Zranění / sestavy notifikace | Dobber, NHL | ✅ NHL (roster diff); ELH ⚠️ | P2 |
| Tipovací liga s kámoši | — | ✅ | P2 |
| NHL EDGE vizualizace | NHL | ✅ | P2 |
| Line combos / WAR / RAPM | NST, Evolving | ⏸ později | P3 |
| Video gólů | NHL | jen odkazy (práva) | P2 |
| Platy / cap | PuckPedia | ⏸ jen odkaz | P3 |
| Hodnocení hráčů (rating) | Sofascore | ⏸ vlastní z GameScore | P3 |

---

## 5. Rizika a otevřené otázky

| Riziko | Dopad | Mitigace |
|---|---|---|
| hokej.cz blokuje serverové IP | Není ELH box score / tabulky | Tabulky počítat ze scoreboardu; box score jako volitelný modul; zkusit Vercel/Supabase IP; kontaktovat ČSLH/eSports |
| Mělká ČR historie (od 02/2025) | Méně dat pro Elo/H2H | Ingest od teď; backfill z legálních zdrojů; Elo konverguje rychle |
| Neoficiální API (NHL, eSports) se změní | Výpadek | Adaptéry se schématovou validací (zod), alerty, fallback na poslední cache, stav „zpožděno" |
| Vercel Cron na Hobby = 1×/den | Nelze live ingest | Live ingest přes Supabase `pg_cron` (sub-minute) → Edge Function (viz architektura) |
| iOS push jen pro nainstalovanou PWA (iOS 16.4+) | Méně uživatelů push | Onboarding „Přidat na plochu" |
| Sázková data | Regulace | Jen informativně, 18+/MFČR banner, žádné affiliate odkazy |
