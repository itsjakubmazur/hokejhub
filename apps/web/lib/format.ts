const TZ = "Europe/Prague";

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("cs-CZ", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatDayShort(date: string): { weekday: string; day: string } {
  const d = new Date(`${date}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("cs-CZ", { timeZone: "UTC", weekday: "short" }).format(d),
    day: new Intl.DateTimeFormat("cs-CZ", { timeZone: "UTC", day: "numeric", month: "numeric" }).format(d),
  };
}

export function formatDayLong(date: string): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function formatOdds(v: number | null | undefined): string {
  return v ? v.toFixed(2) : "–";
}

export function formatPct(v: number): string {
  return `${Math.round(v * 100)} %`;
}
