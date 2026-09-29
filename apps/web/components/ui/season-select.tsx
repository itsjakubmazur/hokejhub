"use client";

import { seasonLabel } from "@/lib/format";
import { usePathname, useRouter, useSearchParams } from "next/navigation";


/** Season dropdown that writes `?sezona=YYYY` into the URL. */
export function SeasonSelect({ seasons, value }: { seasons: number[]; value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <select
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(params);
        next.set("sezona", e.target.value);
        router.push(`${pathname}?${next}`, { scroll: false });
      }}
      className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm font-semibold tabular"
      aria-label="Sezóna"
    >
      {seasons.map((s) => (
        <option key={s} value={s}>
          {seasonLabel(s)}
        </option>
      ))}
    </select>
  );
}
