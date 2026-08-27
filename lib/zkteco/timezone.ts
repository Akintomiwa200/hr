/** Offset of `timeZone` at `date`, in milliseconds (local wall clock minus UTC). */
export function tzOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asUtc - date.getTime();
}

export function gmtOffsetHours(timeZone: string, at = new Date()): number {
  return Math.round(tzOffsetMs(at, timeZone) / 3_600_000);
}

/** Parse a ZKTeco local timestamp (`YYYY-MM-DD HH:mm:ss`) in a branch timezone. */
export function parseDeviceLocalTime(local: string, timeZone: string): Date {
  const match = local
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!match) {
    const fallback = new Date(local);
    return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);

  const offset = tzOffsetMs(new Date(utcGuess), timeZone);
  let utc = utcGuess - offset;
  const offset2 = tzOffsetMs(new Date(utc), timeZone);
  if (offset2 !== offset) utc = utcGuess - offset2;
  return new Date(utc);
}

export function hourMinuteInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return {
    hour: Number(parts.find((p) => p.type === "hour")?.value ?? 0),
    minute: Number(parts.find((p) => p.type === "minute")?.value ?? 0),
  };
}
