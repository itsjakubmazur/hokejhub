/** Title-cases hokej.cz's "Jméno PŘÍJMENÍ" into "Jméno Příjmení". */
export const nice = (name: string) =>
  name.replace(/\p{Lu}{2,}/gu, (w) => w.charAt(0) + w.slice(1).toLocaleLowerCase("cs"));

/** "Jméno Příjmení" → "Příjmení J." (compact, Livesport-style). */
export const short = (name: string) => {
  const parts = nice(name).trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  const first = parts[0]!;
  return `${parts.slice(1).join(" ")} ${first.charAt(0)}.`;
};

export const fmtToi = (s: number | null | undefined) =>
  s == null ? "–" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
