/**
 * Quiet hours in the tenant's local timezone.
 * Supports overnight windows (e.g. 21:00 → 07:00).
 */
export function parseHhMm(value: string): { hours: number; minutes: number } | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!m) return null;
  return { hours: Number(m[1]), minutes: Number(m[2]) };
}

function localMinutesSinceMidnight(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  // en-GB can yield 24:00 at midnight in some engines — normalize
  const h = hour === 24 ? 0 : hour;
  return h * 60 + minute;
}

export function isInQuietHours(
  now: Date,
  startHhMm: string,
  endHhMm: string,
  timeZone = "Asia/Colombo",
): boolean {
  const start = parseHhMm(startHhMm);
  const end = parseHhMm(endHhMm);
  if (!start || !end) return false;

  const startMin = start.hours * 60 + start.minutes;
  const endMin = end.hours * 60 + end.minutes;
  const nowMin = localMinutesSinceMidnight(now, timeZone);

  if (startMin === endMin) return false; // disabled / zero-width
  if (startMin < endMin) {
    // Same-day window e.g. 01:00–05:00
    return nowMin >= startMin && nowMin < endMin;
  }
  // Overnight e.g. 21:00–07:00
  return nowMin >= startMin || nowMin < endMin;
}
