import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Page masthead on the dark scoreboard board: kicker, big display title, optional watermark icon. */
export function PageHero({
  kicker,
  title,
  icon: Icon,
  children,
  aside,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  icon?: LucideIcon;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="arena-lights rise relative overflow-hidden bg-board p-4 text-board-text sm:p-7">
      {Icon ? (
        <Icon
          className="hero-float pointer-events-none absolute -right-6 -top-6 size-48 text-led opacity-[0.07]"
          strokeWidth={1.5}
          aria-hidden
        />
      ) : null}
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {kicker ? <p className="label text-board-muted">{kicker}</p> : null}
          <h1 className="mt-1 text-board-text">{title}</h1>
          {children ? (
            <div className="mt-1.5 max-w-prose text-[13px] leading-snug text-board-muted sm:mt-2 sm:text-sm sm:leading-normal [&_a]:text-led">
              {children}
            </div>
          ) : null}
        </div>
        {aside}
      </div>
    </header>
  );
}
