const PRAGUE = "Europe/Prague";

/** Offset of a time zone from UTC in minutes at the given instant. */
function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/** Converts a Prague wall-clock date (`YYYY-MM-DD`) and time (`HH:MM`) to an ISO UTC string. */
export function pragueToUtcIso(date: string, time: string): string {
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  const [h, mi] = (time || "00:00").split(":").map(Number) as [number, number];
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  // Two passes handle DST transitions correctly.
  let ts = naive - tzOffsetMinutes(new Date(naive), PRAGUE) * 60000;
  ts = naive - tzOffsetMinutes(new Date(ts), PRAGUE) * 60000;
  return new Date(ts).toISOString();
}

/** Today's date in Prague as `YYYY-MM-DD`. */
export function pragueDate(instant: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PRAGUE }).format(instant);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
