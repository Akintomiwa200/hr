import { normalizePin } from "@/lib/zkteco/pin";

type PinHolder = {
  biometricPin: string | null;
  employeeCode: string | null;
};

/** Match a device PIN to an employee code / biometric PIN (numeric and alphanumeric). */
export function pinMatchesEmployee(devicePin: string, person: PinHolder) {
  const pinRaw = devicePin.trim();
  if (!pinRaw) return false;

  const pinNorm = normalizePin(pinRaw);
  const bio = person.biometricPin?.trim() ?? "";
  const code = person.employeeCode?.trim() ?? "";
  const storedNorm = normalizePin(bio) ?? normalizePin(code);

  if (pinNorm && storedNorm && pinNorm === storedNorm) return true;
  if (bio && bio.toUpperCase() === pinRaw.toUpperCase()) return true;
  if (code && code.toUpperCase() === pinRaw.toUpperCase()) return true;
  if (bio === pinRaw || code === pinRaw) return true;

  const pinDigits = pinRaw.replace(/\D/g, "");
  if (pinDigits) {
    if (bio.replace(/\D/g, "") === pinDigits) return true;
    if (code.replace(/\D/g, "") === pinDigits) return true;
  }

  return false;
}

/** PIN strings to search punch logs when replaying after an employee update. */
export function pinSearchVariants(biometricPin?: string | null, employeeCode?: string | null) {
  const variants = new Set<string>();
  for (const value of [biometricPin, employeeCode]) {
    if (!value?.trim()) continue;
    const trimmed = value.trim();
    variants.add(trimmed);
    variants.add(trimmed.toUpperCase());
    const norm = normalizePin(trimmed);
    if (norm) variants.add(norm);
    const digits = trimmed.replace(/\D/g, "");
    if (digits) variants.add(digits);
  }
  return [...variants];
}

/** Lookup keys for a punch coming from a device. */
export function devicePinLookupKeys(devicePin: string) {
  const variants = new Set<string>();
  const trimmed = devicePin.trim();
  if (!trimmed) return [];
  variants.add(trimmed);
  variants.add(trimmed.toUpperCase());
  const norm = normalizePin(trimmed);
  if (norm) variants.add(norm);
  const digits = trimmed.replace(/\D/g, "");
  if (digits) variants.add(digits);
  return [...variants];
}
