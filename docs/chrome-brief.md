# Zadání pro Claude in Chrome — průzkum hokej.cz (historie)

> Zkopíruj celé do Claude in Chrome. Cíl je **průzkum a vzorky**, ne ruční opisování tisíců zápasů.
> Z vzorků napíšu skript, který pak stáhne celou historii najednou a spolehlivě.

## Kontext

Stavím osobní hokejovou appku (HokejHub). Potřebuju historii českých soutěží z hokej.cz od 1993/94
(sezónní stránky) a ze sekce `/historie` (1936–1993). Server hokej.cz blokuje datacentra, proto to jde
přes můj prohlížeč. Chovej se jako běžný návštěvník: **max. 1 stránka za 2–3 s**, nic nepřihlašuj,
neobcházej captchu.

## Úkol 1 — mapa URL (nejdůležitější)

Zjisti a zapiš **přesné tvary URL** (s příklady) pro:

1. Seznam sezón / přepínač sezón u Tipsport extraligy (víme, že `competition=4171` = extraliga, ale
   pravděpodobně jen aktuální sezóna — jak se mění sezóna? jiné `competition` ID pro každý rok?).
   **Udělej tabulku `sezóna → competition ID` pro extraligu 1993/94 → 2025/26.** Když to jde, i pro
   1. ligu / Maxa ligu.
2. Rozpis / výsledky všech zápasů sezóny (základní část, předkolo, play-off, baráž — jsou to samostatné
   stránky / parametry?). Je tam stránkování nebo filtr po kolech/měsících?
3. Tabulka sezóny (konečná, případně k datu).
4. Statistiky hráčů sezóny (bruslaři, brankáři).
5. Detail zápasu `https://www.hokej.cz/zapas/{id}/` — funguje i pro staré zápasy (např. 1995, 2005)?
   Jaké sekce tam u starých zápasů jsou (střelci, sestavy, box score, třetiny)?
6. Sekce `/historie` — co tam je (vítězové, tabulky, výsledky?) a jaká je struktura URL po letech.
7. Existují někde **JSON/XHR požadavky** na pozadí? (DevTools → Network → Fetch/XHR při přepínání sezóny
   nebo kola.) Pokud ano, zapiš URL a ukázku odpovědi — to by bylo ideální.

## Úkol 2 — vzorky HTML

Ulož kompletní HTML (Ctrl+S „Webová stránka, pouze HTML" nebo `document.documentElement.outerHTML`)
těchto stránek, pojmenuj soubory podle vzoru:

| Soubor | Stránka |
|---|---|
| `season-list.html` | přehled/přepínač sezón extraligy |
| `schedule-2024-25.html` | výsledky základní části ELH 2024/25 |
| `schedule-playoff-2024-25.html` | výsledky play-off 2024/25 |
| `schedule-1995-96.html` | výsledky ELH 1995/96 (ověření staré struktury) |
| `standings-2024-25.html` | konečná tabulka 2024/25 |
| `stats-players-2024-25.html` | statistiky hráčů 2024/25 |
| `stats-goalies-2024-25.html` | statistiky brankářů 2024/25 |
| `match-new.html` | detail zápasu z 2025/26 (box score) |
| `match-2005.html` | detail zápasu z 2004/05 |
| `match-1996.html` | detail zápasu z 1995/96 |
| `historie-index.html` | úvodní stránka `/historie` |
| `historie-1970.html` | libovolný ročník z `/historie` (třeba 1969/70) |

## Výstup

1. `hokejcz-urls.md` — odpovědi na úkol 1 (tvary URL, tabulka sezón → ID, poznámky, JSON endpointy).
2. Složka se všemi HTML vzorky.

Pošli mi obojí (zip) — nahraju to do repa do `data/samples/hokejcz/`.

## Co bude dál (pro info)

Ze vzorků napíšu skript, který se spustí přímo na stránce hokej.cz v prohlížeči (stejná doména → žádný
problém s CORS ani blokací), projde všechny sezóny s rozumnou pauzou, rozparsuje HTML a stáhne
výsledek jako JSON. Ten pak jednorázově naimportuju do databáze.
