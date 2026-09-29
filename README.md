# HokejHub

Osobní PWA pro hokejové fanoušky — české ligy + NHL: live, historie, predikce, notifikace.

- [Rešerše (fáze 0)](docs/research.md)
- [Architektura a rozhodnutí](docs/architecture.md)

## Struktura

| Cesta | Obsah |
|---|---|
| `apps/web` | Next.js 16 (App Router) + Tailwind v4, PWA, API proxy |
| `packages/core` | Čisté TS: adaptéry zdrojů (eSports, NHL) se zod validací, doménové typy, modely |
| `supabase/` | Migrace DB (od M3 také Edge Functions pro ingest) |
| `docs/` | Rešerše, architektura |

## Vývoj

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # unit testy (fixtures z reálných API v packages/core/test/fixtures)
pnpm typecheck && pnpm lint && pnpm build
```

MVP zatím nepotřebuje žádné env proměnné — čte veřejné zdroje přímo ze serveru.

Data: eSports.cz / onlajny.com, kurzy Tipsport, NHL data © NHL. Kurzy jsou jen informativní (18+).
