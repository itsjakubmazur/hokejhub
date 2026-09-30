import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CountUp } from "./count-up";

/** Flat panel on the ice: a label in arena lettering over the content, no shadow. */
export function Card({
  title,
  icon: Icon,
  children,
  action,
  className = "",
}: {
  title?: ReactNode;
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rise border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {title || action ? (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          {title ? (
            <h2 className="label flex items-center gap-2 text-fg">
              {Icon ? <Icon className="size-4 text-muted" strokeWidth={2.25} aria-hidden /> : null}
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** A figure with its label: the number carries the weight, no box around it. */
export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="border-l-2 border-line py-0.5 pl-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="display mt-1 text-[2rem] tabular">
        {typeof value === "number" && Number.isFinite(value) ? <CountUp value={value} decimals={Number.isInteger(value) ? 0 : 1} /> : value}
      </div>
      {sub ? <div className="mt-0.5 text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted">{children}</p>;
}
