/**
 * Reads the history pages from hokej.cz and stores them in lib/server/data/, which the history
 * pages serve from. hokej.cz refuses datacenter addresses, so run it from a home connection:
 *
 *   pnpm -C apps/web exec tsx scripts/snapshot-history.ts
 *
 * Needed again only when a world championship is added to MODERN_WC (or the parsers change).
 */
import { writeFileSync } from "node:fs";
import { loadCzechoslovakHistory, loadModernResults, loadNationalWritten } from "../lib/server/history";

const dir = new URL("../lib/server/data/", import.meta.url);

async function main() {
  const [cs, written, results] = await Promise.all([loadCzechoslovakHistory(), loadNationalWritten(), loadModernResults()]);
  if (cs.length < 50 || written.length < 50) throw new Error(`hokej.cz answered too little (${cs.length} seasons, ${written.length} tournaments) — run from a home connection`);
  writeFileSync(new URL("history-cs.json", dir), JSON.stringify(cs) + "\n");
  writeFileSync(new URL("history-national.json", dir), JSON.stringify({ written, results: Object.fromEntries(results) }) + "\n");
  console.log(`${cs.length} seasons, ${written.length} tournaments up to 1999, ${[...results.values()].filter(Boolean).length} modern results`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
