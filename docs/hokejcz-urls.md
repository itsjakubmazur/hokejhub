# hokej.cz — mapa URL a struktura pro scraper historie

Průzkum 29. 9. 2026 (Claude in Chrome, reálný prohlížeč). Cíl: podklad pro skript, který
projede historii extraligy a stáhne ji jako JSON. Značení: ✅ ověřeno v prohlížeči ·
⚠️ pozor/gotcha · ❓ potřeba doověřit (server během průzkumu začal 504-ovat, viz níže).

---

## 0) Nejdůležitější poznatky (přečti první)

1. **Sezónní parametr = počáteční rok.** `season=1993` = sezóna 1993/94. Rozsah v přepínači
   **1992 → 2026** (tj. 1992/93 poslední čs. sezóna → 2026/27). ✅
2. **Competition ID se chová různě podle typu stránky:**
   - **Tabulka a statistiky hráčů: konstantní `4171`** napříč všemi sezónami (season param
     přepíná rok). ✅ ověřeno na 1993 i 2024.
   - **Rozpis zápasů (/zapasy): competition ID je SPECIFICKÝ PRO SEZÓNU.** ✅ 2026/27 = `7562`,
     2024/25 = `7374`. ⚠️ Nedá se hardcodovat jedno ID — viz sekce 2 (jak mapping získat).
3. ⚠️ **Rozpis celé sezóny naráz vrací 504** (server to neutáhne). **Nutno stahovat po kolech**
   (`matchList-view-round-round={N}`). ✅ 504 opakovaně potvrzeno.
4. ⚠️ **Pacing:** server je citlivý — při rychlejším tempu začne vracet 504 na všechno.
   Drž **max 1 request / 2–3 s**, ideálně víc, a retry s backoffem. (Během průzkumu se to stalo.)
5. **Vše je server-rendered HTML, bez CORS a bez čistého JSON API.** ❓/✅ Na pozadí běží jen
   live top-scoreboard widget (`json.esports.cz/.../scoreboard/...` — aktuální den) a živé kurzy;
   **historická data se NEnačítají přes XHR/JSON**, jsou přímo v HTML stránky. → scraper musí
   parsovat HTML (běží u tebe v prohlížeči na doméně hokej.cz → žádné CORS).

---

## 1) Tvary URL (ověřené)

Základ: `https://www.hokej.cz`. `{Y}` = počáteční rok sezóny.

### Tabulka (konečné pořadí) ✅
```
/tipsport-extraliga/table?table-filter-season={Y}&table-filter-competition=4171
```
- Ověřeno 1993/94 (vítěz zákl. části HC Rabat Kladno) i 2024/25.
- Competition **4171 konstantní** pro všechny sezóny.

### Statistiky hráčů (bruslaři) ✅
```
/tipsport-extraliga/player-stats/detailni?stats-filter-season={Y}&stats-filter-competition=4171
```
- Ověřeno 1993/94 (nejproduktivnější Pavel Patera, 60 b.).
- Sloupce (stará sezóna 1993/94): `POŘ. | JMÉNO | TÝM | POZ. | GP | G | A | P | +/- | + | - | PIM`.
- ❓ U novějších sezón bývá sloupců víc (rozšířené statistiky) — parser ať čte hlavičku
  tabulky dynamicky, ne fixní pořadí.

### Statistiky brankářů ✅ (mechanika potvrzena)
- Brankáři jsou **záložka/filtr „Brankáři" uvnitř Centra statistik** (vedle bruslařů),
  ne samostatná URL cesta. Používá stejné `stats-filter-season` / `stats-filter-competition`
  jako bruslaři. Skript: načti stats-center pro sezónu, přepni na záložku „Brankáři"
  (nebo použij její href) a parsuj brankářskou tabulku (sloupce ČAS, Z, G, %Z, A, T).

### Rozpis / výsledky zápasů ✅ (doplněno 2. průzkumem)
```
/tipsport-extraliga/zapasy?matchList-filter-season={Y}&matchList-filter-competition={COMP}&matchList-view-round-round={N}
```
- ⚠️ `{COMP}` je **specifické pro sezónu I PRO FÁZI**. Fáze soutěže jsou samostatné
  „competitions" — v dropdownu na stránce jsou tyto položky: ✅
  - **„Tipsport extraliga"** = základní část
  - **„Play off Tipsport extraligy"** = playoff (předkolo + čtvrtfinále + semifinále + finále)
  - **„Baráž o extraligu"** = baráž
  Ověřené příklady ID: 2024/25 základní = `7230`, 2024/25 **playoff = `7374`**, 2026/27 základní = `7562`.
  → **ID se NEHARDCODUJE**; skript ať je čte z competition dropdownu pro danou sezónu+fázi (viz níže).
- ⚠️ Základní část celé sezóny naráz → **504**. Stahuj po kolech `matchList-view-round-round={N}`
  (dropdown „1. kolo", „2. kolo", …). ✅
- ✅ **Playoff se načte celý najednou** (výběrem competition = „Play off…"): stránka vrátí
  všechny série a všechny zápasy včetně **skóre po třetinách a značek P (prodloužení) / SN
  (nájezdy)**. Struktura: nadpisy fází (Předkolo / Čtvrtfinále / Semifinále / Finále),
  pod nimi „Série A – B: 3:2" a jednotlivé zápasy s rozpisem `(1:0, 2:1, 0:0 - 1:0)`.
- ✅ Odkaz na detail zápasu = „Záznam utkání" → `/zapas/{id}/`.
- ✅ Sezóny na /zapasy jdou až **1991-1992** (o rok dál než stats-center, který začínal 1992/93).

### Jak získat competition ID pro rozpis (mapping sezóna+fáze → ID)
Dropdown sezón má jako hodnoty jen roky; competition ID (per sezóna+fáze) app dosadí interně.
Nejspolehlivější: na `/zapasy` vyber sezónu a v competition dropdownu fázi
(„Tipsport extraliga" / „Play off…" / „Baráž…"), počkej, přečti `window.location` →
obsahuje `matchList-filter-competition={ID}`. Skript si tak jednorázově sestaví mapu
(rok, fáze) → ID pro všechny sezóny. Ověřené: 2024 základní=7230, 2024 playoff=7374, 2026 základní=7562.

⚠️ Poznámka ke competition 4171: u **tabulky a statistik hráčů** fungovalo `4171` jako
generický alias napříč sezónami (pohodlné), ale „native" per-sezónní ID existuje taky
(tabulka 2024 = 7230). Pro rozpis 4171 nefunguje — tam ber ID z dropdownu.

### Detail zápasu ✅ (formát) / ❓ (staré ID)
```
/zapas/{hokejcz_id}/
```
- Aktuální/nové zápasy ✅ (kompletní box score — viz struktura níže; ID např. 2928291 = 2026/27).
- ❓ Staré zápasy (1996, 2005): stránku detailu se během průzkumu nepodařilo otevřít
  (chyběla stará ID — berou se z rozpisu po kolech, který 504-oval). Doporučení: ID starých
  zápasů získat z per-round rozpisu dané sezóny a pak otevřít `/zapas/{id}/`; u starých
  sezón čekej méně sekcí (nejspíš jen skóre po třetinách, střelci, sestavy — ne moderní
  TOI/shot mapy).

### Historie (1936 → 1993 a dál) ✅
```
/historie                      → rozcestník: Domácí soutěže / Reprezentace / Rekordy ELH
/historie/stranka/{id}         → pětiletý blok (např. 5017964 = 1936–1941)
```
- Bloky po 5 letech: 1936–1941, 1941–1946, … až po současnost.
- Obsah bloku: pro každou sezónu konečná tabulka, mistr, nejlepší střelec, sestavy (text + tabulky).
- Nejlepší zdroj pro **čs. éru 1936–1993** a historii titulů.

---

## 2) Struktura HTML (pro parser) — z ověřených čtení

### Tabulka (table)
- `<table>` se řádky týmů. Sloupce (moderní): `# TÝM Z V VP R PP P SKÓRE B B% …` (rozšířené).
  Starší sezóny mají užší sadu (`Z V VP R PP P SKÓRE B`). → parsuj podle hlavičky, ne fixně.

### Statistiky hráčů (player-stats/detailni)
- `<table>`, hlavička viz výše. Řádek = hráč (pořadí, jméno, tým, pozice, GP, G, A, P, +/-, PIM…).

### Detail zápasu (nové zápasy)
- Záložky: `Souhrn`, `Podrobné statistiky`, `Vizualizace: střely`, `Vizualizace: buly`.
- **Box score** (`<table>`): `Č | P | HRÁČ | TOI | PP TOI | SH TOI | G | A | B | T | +/- | H | S | B(bloky) | BULY | RI`.
- **Brankáři** (`<table>`): `Č | P | HRÁČ | ČAS | Z(zákroky) | G(obdržené) | %Z | A | T`.
- **Zápis o utkání**: góly (čas, tým, střelec (počet), asistence, situace 5/5·PP·GV) + tresty.
- **Statistika zápasu**: střely na branku, zblokované, vyloučení, využití/oslabení, hity,
  bloky, vhazování, trestné minuty, Radegast index — jako „a:b" dvojice.
- Rozhodčí (hlavní + čároví).
- ⚠️ Souřadnice střel (shot mapa) NEjsou v HTML — jen přes Lightstreamer push (live). Pro
  historii tedy shot mapy nedostupné.

### Historie blok (/historie/stranka/{id})
- Sekce po sezónách: nadpis „Sezóna YYYY/YYYY", pod ním tabulka, řádek s mistrem, nejlepší
  střelec, textové sestavy.

---

## 3) Doporučený postup pro skript (běží in-browser na hokej.cz)

1. **Mapa rok→competition pro rozpis:** načti `/zapasy`, projdi `<select season>`, pro každý
   rok přečti výsledné `matchList-filter-competition`. Ulož mapu.
2. **Tabulky:** pro `Y` = 1992…2026 stáhni `/table?table-filter-season=Y&table-filter-competition=4171`, parsuj.
3. **Statistiky hráčů/brankářů:** analogicky `player-stats/detailni` (+ brankářská záložka), competition 4171.
4. **Rozpis:** pro každý rok a každou položku round/fáze dropdownu stáhni
   `/zapasy?...season=Y&competition={COMP_Y}&matchList-view-round-round=N`, posbírej `/zapas/{id}/`.
   **Nikdy ne celou sezónu naráz (504).**
5. **Detaily zápasů:** pro nasbíraná ID stáhni `/zapas/{id}/`, parsuj box score (u starých méně sekcí).
6. **Čs. éra a tituly:** doplň z `/historie/stranka/{id}` (bloky po 5 letech, 1936→).
7. **Pacing:** 1 request / 2–3 s (raději víc), retry s exponenciálním backoffem, 504 = počkej a opakuj.
8. **Křížová kontrola:** Wikipedia (sezónní tabulky + playoff pavouci), EliteProspects, hockeydb.

---

## 4) Stav a sběr syrových HTML vzorků

Po výpadku a obnově hokej.cz jsem doověřil rozpis, playoff, fáze a brankáře (viz ✅ výše).
Zbývá dořešit spíš „mechanické" věci, které kazí navigační lag/citlivost serveru pod
automatizací (ne principiální neznámé): přesná tabulka (rok, fáze)→ID pro všech 35 sezón,
detail konkrétního starého zápasu, a uložení kompletních HTML souborů.

Kompletní HTML (Úkol 2) přes tenhle kanál spolehlivě neuložím (velké výpisy se ořezávají,
tracking URL s query stringy padají na filtr, a rychlé tahání server zase shodí do 504).

**Nejčistší cesta = krátký in-browser sběrač** na doméně hokej.cz (žádné CORS, plná kontrola
tempa): projde definovaný seznam (sezóny × fáze × kola), s pauzou ~3 s uloží
`document.documentElement.outerHTML` + rovnou z dropdownů posbírá mapu (rok,fáze)→ID.
Tahle URL mapa + struktura HTML výše je přesně jeho zadání. **Řekni a napíšu ti ho**
(klidně rovnou s parserem, ať z toho padá JSON).
