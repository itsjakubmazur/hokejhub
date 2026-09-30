import Link from "next/link";

/** Switch between club history and national team history. */
export function HistoryTabs({ active }: { active: "liga" | "repre" }) {
  const tabs = [
    { id: "liga", href: "/historie", label: "Liga 1936–1993" },
    { id: "repre", href: "/historie/reprezentace", label: "Reprezentace na MS" },
  ] as const;
  return (
    <nav className="flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          className={`label relative px-3 py-3 ${active === t.id ? "text-fg" : "text-muted hover:text-fg"}`}
        >
          {t.label}
          {active === t.id ? <span className="absolute inset-x-2 -bottom-px h-[3px] bg-live" /> : null}
        </Link>
      ))}
    </nav>
  );
}
