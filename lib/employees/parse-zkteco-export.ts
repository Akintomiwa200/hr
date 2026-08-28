import type { WorkSheet } from "xlsx";
import * as XLSX from "xlsx";
import type { DeviceEmployeeRow } from "@/lib/employees/import-from-device";

type RawRow = Record<string, unknown>;

function cell(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

function splitName(full: string) {
  const cleaned = full.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Staff", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function pinFromHeaders(headers: string[], values: string[]) {
  const map = new Map<string, string>();
  headers.forEach((h, i) => map.set(normalizeHeader(h), values[i] ?? ""));

  const pin = cell(
    map.get("employee id") ||
      map.get("employeeid") ||
      map.get("emp id") ||
      map.get("pin") ||
      map.get("badge number") ||
      map.get("user id") ||
      map.get("code")
  );
  return pin;
}

function rowFromHeaders(headers: string[], values: string[]): DeviceEmployeeRow | null {
  const pin = pinFromHeaders(headers, values);
  if (!pin) return null;

  const map = new Map<string, string>();
  headers.forEach((h, i) => map.set(normalizeHeader(h), values[i] ?? ""));

  const fullName =
    cell(map.get("first name")) ||
    cell(map.get("name")) ||
    cell(map.get("employee name")) ||
    cell(map.get("full name"));
  const { firstName, lastName } = splitName(fullName || pin);

  return {
    pin,
    firstName,
    lastName,
    email: cell(map.get("email") || map.get("e-mail")) || null,
    jobTitle:
      cell(map.get("position code") || map.get("position") || map.get("job title")) ||
      "Staff",
    departmentName: cell(map.get("department") || map.get("dept")) || null,
  };
}

/** Parse ZKTeco report sheets where row 0 is a title and row 1 is the real header. */
export function parseZktecoEmployeeMatrix(matrix: unknown[][]): DeviceEmployeeRow[] {
  let headerIndex = -1;
  for (let i = 0; i < Math.min(matrix.length, 20); i++) {
    const row = (matrix[i] ?? []).map((c) => cell(c));
    const joined = row.join(" ").toLowerCase();
    if (joined.includes("employee id") || joined.includes("employeeid")) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex < 0) return [];

  const headers = (matrix[headerIndex] ?? []).map((c) => cell(c));
  const parsed: DeviceEmployeeRow[] = [];

  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const values = (matrix[i] ?? []).map((c) => cell(c));
    if (values.every((v) => !v)) continue;
    const row = rowFromHeaders(headers, values);
    if (row) parsed.push(row);
  }

  return dedupeByPin(parsed);
}

export function parseZktecoEmployeeSheet(sheet: WorkSheet): DeviceEmployeeRow[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  const fromMatrix = parseZktecoEmployeeMatrix(matrix);
  if (fromMatrix.length > 0) return fromMatrix;

  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });
  return parseZktecoEmployeeExport(rows);
}

function pick(row: RawRow, ...keys: string[]) {
  const map = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    map.set(normalizeHeader(k), v);
  }
  for (const key of keys) {
    const value = cell(map.get(normalizeHeader(key)));
    if (value) return value;
  }
  return "";
}

/** Parse flat JSON rows (simple exports with headers on row 1). */
export function parseZktecoEmployeeExport(rows: RawRow[]): DeviceEmployeeRow[] {
  const parsed: DeviceEmployeeRow[] = [];

  for (const row of rows) {
    const pin = pick(
      row,
      "Employee Id",
      "Employee ID",
      "EmployeeID",
      "Emp ID",
      "EmpID",
      "PIN",
      "Pin",
      "Badge Number",
      "BadgeNumber",
      "User ID",
      "UserID",
      "userid",
      "No.",
      "No",
      "Code",
      "Employee Code",
      "EmployeeCode"
    );
    if (!pin) continue;

    let firstName = pick(row, "First Name", "FirstName", "Given Name");
    let lastName = pick(row, "Last Name", "LastName", "Surname", "Family Name");
    const fullName = pick(row, "Name", "Employee Name", "EmployeeName", "Full Name");
    if (!firstName && !lastName && fullName) {
      const split = splitName(fullName);
      firstName = split.firstName;
      lastName = split.lastName;
    }
    if (!firstName) firstName = pin;

    parsed.push({
      pin,
      firstName,
      lastName: lastName || firstName,
      email: pick(row, "Email", "E-mail", "Mail") || null,
      jobTitle: pick(row, "Job Title", "JobTitle", "Position", "Title") || "Staff",
      departmentName: pick(row, "Department", "Dept", "Division") || null,
    });
  }

  return dedupeByPin(parsed);
}

function dedupeByPin(rows: DeviceEmployeeRow[]) {
  const byPin = new Map<string, DeviceEmployeeRow>();
  for (const row of rows) {
    byPin.set(row.pin.toUpperCase(), row);
  }
  return [...byPin.values()];
}

export function summarizeImportRows(rows: DeviceEmployeeRow[]) {
  return {
    count: rows.length,
    sample: rows.slice(0, 5).map((r) => ({
      pin: r.pin,
      name: `${r.firstName} ${r.lastName}`.trim(),
    })),
  };
}
