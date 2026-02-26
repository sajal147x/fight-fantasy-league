/**
 * Formats a UTC ISO date string into the user's local timezone.
 * Example output: "Sat, March 15 2025 · 7:00 PM EST"
 * Must only be called client-side (reads browser timezone).
 */
export function formatEventDate(iso: string): string {
  const date = new Date(iso);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
    timeZoneName: "short",
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("weekday")}, ${get("month")} ${get("day")} ${get("year")} · ${get("hour")}:${get("minute")} ${get("dayPeriod")} ${get("timeZoneName")}`;
}
