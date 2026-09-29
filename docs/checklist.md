# HokejHub – kontrolní seznam požadavků

Stav k 30. 9. 2026. ✅ hotovo · 🟡 částečně / čeká na data · ⏳ zbývá

## Data a zdroje
- ✅ Živá data českých lig (eSports/onlajny) a NHL (api-web), odolnost vůči 404/CORS/variantám feedu
- ✅ Crawler celé historie extraligy z hokej.cz (fronta, polite pacing, GitHub Action) – 🟡 běží, ~14 tis. zápasů
- ✅ Historie čs. ligy 1936–1993 (`/historie`) – mistři, tabulky, sestavy medailistů, nejlepší střelci
- ✅ Historické bodové systémy (2-1-0 s remízami ≤1999, 3/2/1/1 2000–2005, 3-2-1-0 od 2006)
- ✅ Historické kapacity stadionů (tabulka `arena_era` + odhad z vyprodaných zápasů)
- ✅ Fotky hráčů z hokej.cz všude (silueta jen když hokej.cz fotku nemá) – 🟡 doplňují se s crawlerem
- ✅ Loga týmů všude

## Zápas (game center)
- ✅ Livesport layout, záložky Přehled / Přenos / Statistiky / Sestavy / Střely / Hráči / H2H / Kurzy
- ✅ Časová osa domácí vlevo / hosté vpravo, fotky střelců, odkazy na hráče
- ✅ Živý čas zápasu (sekundy, ne jen minuta) z textového přenosu
- ✅ Statistiky po třetinách (přepínač), grafické sestavy s fotkami
- ✅ xG i pro extraligu (vlastní model, střely z hokej.cz), mapa střel, xG flow, buly podle zón
- ✅ Zajímavosti a milníky (100. zápas v klubu, série, blížící se milníky)
- ✅ Pravděpodobnost výhry v průběhu zápasu (graf), predikce modelu vs. trh
- ✅ Automatický textový report po zápase
- ✅ Sdílení: generovaný obrázek výsledku (OG karta) + tlačítko Sdílet
- ✅ Animace gólu, konce třetiny / zápasu

## Tabulky a statistiky ligy
- ✅ Živá tabulka, normální, forma 5/10/15, doma/venku, over/under
- ✅ Kanadské bodování, střelci, xG, brankáři, návštěvnost, historie sezón

## Týmy a hráči
- ✅ Stránka týmu: přehled, výsledky (vše/doma/venku), hráči, návštěvnost, historie, graf síly (Elo) v čase
- ✅ Stránka hráče: kompletní kariéra, zápasy, střely, milníky, bio s fotkou
- ✅ Porovnání hráčů (`/porovnat`)

## Návštěvnost
- ✅ Vyprodané zápasy, průměr základní část vs. play-off, podle soupeře, % zaplnění (100 % = vyprodáno)

## Predikce a analytika
- ✅ Elo + Poisson (1/0/2, očekávané skóre), backtest a kalibrace (`/predikce`)
- ✅ Model vs. kurzy Tipsportu, value tipy (i přímo ve výsledcích)
- 🟡 Přetrénovat xG na střelách extraligy a znovu kalibrovat Elo po dokončení crawleru

## Fan hub
- ✅ Vyhledávání (⌘K / „/“) – hráči, týmy, stránky
- ✅ Oblíbené týmy (hvězdička) → sekce „Moje týmy“ nahoře ve výsledcích
- ✅ Tento den v historii (zápasy, hattricky, narozeniny)
- ✅ Rekordy extraligy
- ✅ Tipovačka: ty vs. model
- ✅ Push notifikace s pravidly (góly, začátek, koncovka, konec, noční klid) – 🟡 potřebuje VAPID klíče ve Vercelu

## PWA a UX
- ✅ Instalovatelná PWA, offline stránka, service worker
- ✅ Spodní navigace na mobilu, tmavý/světlý režim
- ✅ Animace: přechody stránek, puk jako loader, naskakující čísla, vykreslování grafů

## Zbývá / nápady
- ⏳ Vizualizace buly nad rámec zón (kdo s kým vyhrává)
- ⏳ Reprezentace (MS, OH) z hokej.cz historie
- ⏳ LLM shrnutí (volitelně, vyžaduje API klíč) – teď pravidlový report bez klíče
