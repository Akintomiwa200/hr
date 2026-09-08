/** Calendar date helpers that avoid UTC-midnight timezone shifts. */

function buildDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseSlashDate(raw: string): Date | null {
  const parts = raw.split(/[\/.\-]/);
  if (parts.length !== 3) return null;
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  let year = Number(parts[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(year)) return null;
  if (year < 100) year += 2000;
  // Try DD/MM/YYYY first (Nigerian / intl default)
  const ddMm = buildDate(year, b, a);
  if (ddMm) return ddMm;
  // Fall back to MM/DD/YYYY (US format — e.g. 08/30/2026)
  const mmDd = buildDate(year, a, b);
  if (mmDd) return mmDd;
  return null;
}

export function parseLocalDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value).trim();
  // Explicit YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) {
    return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0));
  }
  // Slash/dot date — try DD/MM first, fall back to MM/DD
  if (/^\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}$/.test(raw)) {
    return parseSlashDate(raw);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toDateInputValue(value: Date | string | null | undefined): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
