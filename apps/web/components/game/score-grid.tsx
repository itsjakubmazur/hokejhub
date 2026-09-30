"use client";

/**
 * Exact-score probabilities after 60 minutes (independent Poisson with the model's draw boost),
 * as a heat grid: rows = home goals, columns = away goals, one hue from faint to strong.
 */
function poisson(k: number, l: number) {
  let p = Math.exp(-l);
  for (let i = 1; i <= k; i++) p *= l / i;
  return p;
}

export function ScoreGrid({ expHome, expAway, homeLabel, awayLabel }: { expHome: number; expAway: number; homeLabel: string; awayLabel: string }) {
  const N = 6;
  const cells: number[][] = [];
  let sum = 0;
  for (let h = 0; h < N; h++) {
    cells.push([]);
    for (let a = 0; a < N; a++) {
      const p = poisson(h, expHome) * poisson(a, expAway) * (h === a ? 1.35 : 1);
      cells[h]!.push(p);
      sum += p;
    }
  }
  const norm = cells.map((r) => r.map((p) => p / sum));
  const max = Math.max(...norm.flat());
  const top = norm
    .flatMap((r, h) => r.map((p, a) => ({ h, a, p })))
    .sort((x, y) => y.p - x.p)
    .slice(0, 3);
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2 text-sm">
        {top.map((t, i) => (
          <span key={i} className={`border px-2 py-1 tabular ${i === 0 ? "border-fg font-semibold" : "border-line"}`}>
            {t.h}:{t.a} <span className="text-muted">{Math.round(t.p * 100)} %</span>
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="text-center text-[11px] tabular">
          <thead>
            <tr>
              <th className="pr-2 text-right text-[10px] font-medium text-muted">
                {homeLabel} ↓ / {awayLabel} →
              </th>
              {Array.from({ length: N }, (_, a) => (
                <th key={a} className="w-10 pb-1 font-semibold text-muted">
                  {a}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {norm.map((row, h) => (
              <tr key={h}>
                <th className="pr-2 text-right font-semibold text-muted">{h}</th>
                {row.map((p, a) => {
                  const k = p / max;
                  return (
                    <td
                      key={a}
                      title={`${h}:${a} po 60 minutách – ${(p * 100).toFixed(1)} %`}
                      className="h-8 w-10 border border-surface"
                      style={{ background: `color-mix(in oklab, var(--accent) ${Math.round(8 + k * 82)}%, var(--surface))`, color: k > 0.55 ? "white" : "var(--text)" }}
                    >
                      {p >= 0.02 ? Math.round(p * 100) : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted">Pravděpodobnost přesného výsledku po 60 minutách v %. Silnější barva = pravděpodobnější.</p>
    </div>
  );
}
