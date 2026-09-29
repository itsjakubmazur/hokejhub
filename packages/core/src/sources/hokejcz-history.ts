/**
 * hokej.cz "Historie – Domácí soutěže" pages (/historie/stranka/{id}, five seasons per page,
 * 1936 →). Content is hand-written CMS text: final tables in monospace spans, champion rosters,
 * top scorer, play-off series and notes. We turn it into structured seasons.
 */

export const HOKEJCZ_HISTORY_PAGES: { id: number; label: string }[] = [
  { id: 5017964, label: "1936–1941" },
  { id: 5018016, label: "1941–1946" },
  { id: 5018022, label: "1946–1951" },
  { id: 5018023, label: "1951–1956" },
  { id: 5018032, label: "1956–1961" },
  { id: 5018034, label: "1961–1966" },
  { id: 5018035, label: "1966–1971" },
  { id: 5018036, label: "1971–1976" },
  { id: 5018037, label: "1976–1981" },
  { id: 5018038, label: "1981–1986" },
  { id: 5018039, label: "1986–1991" },
  { id: 5018045, label: "1991–1996" },
  { id: 5018078, label: "1996–2001" },
  { id: 5018111, label: "2001–2006" },
  { id: 5018114, label: "2006–2011" },
  { id: 5018115, label: "2011–2016" },
];

export interface HistoryRow {
  rank: number;
  team: string;
  gp: number | null;
  w: number | null;
  t: number | null;
  l: number | null;
  gf: number;
  ga: number;
  pts: number;
}

export interface HistoryTable {
  title: string;
  rows: HistoryRow[];
}

export interface HistorySeason {
  /** Starting year, e.g. 1966 for 1966/1967. */
  season: number;
  label: string;
  tables: HistoryTable[];
  /** Champion as written in the roster line (short club name), when determinable. */
  champion: string | null;
  rosters: { team: string; players: string }[];
  topScorer: { name: string; team: string | null; goals: number | null; text: string } | null;
  /** Play-off rounds, final standings and similar result lines. */
  results: string[];
  notes: string[];
}

function toLines(html: string): string[] {
  let body = html;
  const start = body.indexOf('<div class="col-xl">');
  if (start >= 0) body = body.slice(start);
  const end = body.search(/<footer|class="footer/);
  if (end > 0) body = body.slice(0, end);
  const text = body
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>|<\/tr>|<\/div>/gi, "\n")
    .replace(/<td[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;| /g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  return text
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
}

// "1. Dukla Jihlava 36 23 6 7 173:81 52" (also "180 123" without colon, OCR-ish "O" for 0).
const ROW = /^(\d{1,2})\.\s+(.+?)\s+((?:[\dO]+\s+){0,4})(\d+)\s*[:\s]\s*(\d+)\s+(\d+)$/;
const RESULT = /^(Play ?off|Předkolo|Osmifinále|Čtvrtfinále|Semifinále|Finále|O \d\. místo|O záchranu|O postup|Konečné pořadí|Baráž|Kvalifikace|Prolínací|Nadstavba)/i;
const SCORER = /^Nejlepší střel(ec|ci)[^:]*:\s*(.+)$/i;

function parseRow(m: RegExpExecArray): HistoryRow {
  const nums = m[3]!
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((x) => Number(x.replace(/O/g, "0")));
  const [gp, w, t, l] = nums.length === 4 ? nums : nums.length === 3 ? [null, ...nums] : [nums[0] ?? null, null, null, null];
  return { rank: Number(m[1]), team: m[2]!.trim(), gp: gp ?? null, w: w ?? null, t: t ?? null, l: l ?? null, gf: Number(m[4]), ga: Number(m[5]), pts: Number(m[6]) };
}

export function parseHokejczHistory(html: string): HistorySeason[] {
  const lines = toLines(html);
  const seasons: HistorySeason[] = [];
  let cur: HistorySeason | null = null;
  let pendingTitle: string | null = null;
  let table: HistoryTable | null = null;

  for (const line of lines) {
    const sm = /^Sezóna\s+(\d{4})\s*\/\s*(\d{2,4})/.exec(line);
    if (sm) {
      cur = { season: Number(sm[1]), label: `${sm[1]}/${sm[2]!.length === 2 ? sm[1]!.slice(0, 2) + sm[2] : sm[2]}`, tables: [], champion: null, rosters: [], topScorer: null, results: [], notes: [] };
      seasons.push(cur);
      pendingTitle = null;
      table = null;
      continue;
    }
    if (!cur) continue;

    const row = ROW.exec(line);
    if (row) {
      if (!table) {
        table = { title: pendingTitle ?? "Tabulka", rows: [] };
        cur.tables.push(table);
        pendingTitle = null;
      }
      table.rows.push(parseRow(row));
      continue;
    }
    table = null;

    const sc = SCORER.exec(line);
    if (sc) {
      const text = sc[2]!.replace(/\(na fotografii\)/g, "").trim();
      const m = /^([^(:]{3,40}?)\s*\(([^)]+)\)\s*(\d+)?/.exec(text);
      if (m) cur.topScorer ??= { name: m[1]!.trim(), team: m[2]!.trim(), goals: m[3] ? Number(m[3]) : null, text };
      else cur.notes.push(line);
      continue;
    }
    if (RESULT.test(line)) {
      cur.results.push(line);
      if (/^Konečné pořadí/i.test(line)) {
        const first = /1\.\s*([^,]+)/.exec(line);
        if (first) cur.champion = first[1]!.trim();
      }
      continue;
    }
    // Roster: "Jihlava: Hovora, Podhorský - J. Suchý, … - trenér Pitner"
    const ro = /^([^:]{2,45}):\s*(.+)$/.exec(line);
    const leagueLabel = ro && /liga|ČNL|SNL|skupin|divize|třída|župa|^[A-D]$/i.test(ro[1]!);
    if (ro && !leagueLabel && (ro[2]!.match(/,/g)?.length ?? 0) >= 4 && / - /.test(ro[2]!) && !/\d{2}\s*-/.test(ro[2]!)) {
      cur.rosters.push({ team: ro[1]!.trim(), players: ro[2]!.trim() });
      continue;
    }
    // Continuation of a wrapped result line.
    if (cur.results.length && /^[A-ZČŘŠŽÚ]{1,3}\s*-\s*[A-ZČŘŠŽÚ]{1,3}\s/.test(line)) {
      cur.results[cur.results.length - 1] += ` ${line}`;
      continue;
    }
    // Short lines before a table are its title ("I. liga", "Skupina B").
    if (line.length <= 60 && !/[.:]$/.test(line) && !/\d+:\d+/.test(line)) {
      pendingTitle = line;
      continue;
    }
    cur.notes.push(line);
  }

  for (const s of seasons) {
    s.champion ??= s.rosters[0]?.team ?? s.tables[0]?.rows[0]?.team ?? null;
  }
  return seasons;
}
