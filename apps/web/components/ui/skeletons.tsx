/** Route-level loading states. Pure server markup + CSS so they render the instant a link is clicked. */

export function HeroSkeleton({ tall = false, portrait = false }: { tall?: boolean; portrait?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-board p-5 sm:p-7 ${tall ? "min-h-56" : ""}`}>
      <div className="ice-sweep absolute inset-0" aria-hidden />
      <div className="relative flex items-end gap-5">
        {portrait ? <div className="skel-board h-40 w-30 shrink-0 sm:h-48 sm:w-36" /> : null}
        <div className="flex-1 space-y-3">
          <div className="skel-board h-3 w-28" />
          <div className="skel-board h-9 w-2/3 max-w-sm" />
          <div className="skel-board h-3 w-1/2 max-w-xs" />
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton({ rows = 5, photos = false }: { rows?: number; photos?: boolean }) {
  return (
    <div className="border border-line bg-surface p-4 sm:p-5">
      <div className="skeleton mb-4 h-3.5 w-40" />
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            {photos ? <div className="skeleton h-12 w-9 shrink-0" /> : <div className="skeleton size-7 shrink-0" />}
            <div className="skeleton h-3.5 flex-1" style={{ maxWidth: `${60 + ((i * 37) % 35)}%` }} />
            <div className="skeleton h-5 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TabsSkeleton({ n = 5 }: { n?: number }) {
  return (
    <div className="flex gap-5 border-b border-line pb-3">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skeleton h-3.5 w-16" />
      ))}
    </div>
  );
}

/** The match scoreboard placeholder: two crests, a dark score panel. */
export function ScoreboardSkeleton() {
  return (
    <div className="relative overflow-hidden bg-board px-4 py-6 sm:py-9">
      <div className="ice-sweep absolute inset-0" aria-hidden />
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex flex-col items-center gap-3">
          <div className="skel-board size-20 sm:size-32" />
          <div className="skel-board h-4 w-24" />
        </div>
        <div className="flex items-center gap-3">
          <div className="skel-board h-14 w-12 sm:h-20 sm:w-16" />
          <div className="led text-3xl text-led/40">:</div>
          <div className="skel-board h-14 w-12 sm:h-20 sm:w-16" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="skel-board size-20 sm:size-32" />
          <div className="skel-board h-4 w-24" />
        </div>
      </div>
    </div>
  );
}
