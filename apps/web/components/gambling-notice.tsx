export function GamblingNotice({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`flex items-start gap-2 text-muted ${compact ? "text-[11px]" : "text-xs"}`}>
      <span className="grid size-5 shrink-0 place-items-center rounded-full border border-current text-[9px] font-bold">
        18+
      </span>
      <span>
        Kurzy jsou pouze informativní. Účast na hazardních hrách osob mladších 18 let je zakázána. Hazardní hraní
        může vést ke vzniku závislosti. Ministerstvo financí varuje: Účastí na hazardní hře může vzniknout
        závislost!
      </span>
    </p>
  );
}
