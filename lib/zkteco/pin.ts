/** ZKTeco PINs are numeric. EMP001 and "001" both normalize to "1". */
export function normalizePin(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return value.trim() || null;
  return String(parseInt(digits, 10));
}

export function pinFromEmployeeCode(employeeCode: string): string | null {
  return normalizePin(employeeCode);
}
