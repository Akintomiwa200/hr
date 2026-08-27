export type ZohoPeopleEmployee = {
  email: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  jobTitle: string;
  department: string;
  phone: string;
  status: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function field(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value == null) continue;
    if (typeof value === "object") {
      const rec = asRecord(value);
      const nested = rec?.Name ?? rec?.name ?? rec?.displayValue ?? rec?.ID;
      if (nested != null && String(nested).trim()) return String(nested).trim();
      continue;
    }
    if (String(value).trim()) return String(value).trim();
  }
  return "";
}

function pushRow(rows: Record<string, unknown>[], value: unknown) {
  const rec = asRecord(value);
  if (rec) rows.push(rec);
}

/** Zoho People getRecords nests each row as `{ recordId: [ { fields } ] }`. */
export function flattenZohoPeopleRecords(payload: unknown): Record<string, unknown>[] {
  const root = asRecord(payload);
  const response = asRecord(root?.response) ?? root;
  const result = response?.result;
  const rows: Record<string, unknown>[] = [];

  const items = Array.isArray(result)
    ? result
    : result && typeof result === "object"
      ? Object.values(result)
      : [];

  for (const item of items) {
    const rec = asRecord(item);
    if (!rec) continue;
    if (field(rec, "EmailID", "Email", "DepartmentName", "Department")) {
      rows.push(rec);
      continue;
    }
    for (const value of Object.values(rec)) {
      if (Array.isArray(value)) {
        for (const entry of value) pushRow(rows, entry);
      } else {
        pushRow(rows, value);
      }
    }
  }
  return rows;
}

export function mapZohoPeopleEmployee(row: Record<string, unknown>): ZohoPeopleEmployee | null {
  const email = field(row, "EmailID", "Email", "Work_Email", "Email_ID");
  if (!email) return null;
  return {
    email: email.toLowerCase(),
    firstName: field(row, "FirstName", "First_Name") || "Employee",
    lastName: field(row, "LastName", "Last_Name"),
    employeeCode: field(row, "EmployeeID", "Employee_ID", "EmployeeId"),
    jobTitle: field(row, "Designation", "JobTitle", "Job_Title"),
    department: field(row, "Department", "DepartmentName", "Department_Name"),
    phone: field(row, "Mobile", "Phone", "Work_Phone"),
    status: field(row, "Employeestatus", "EmployeeStatus", "Status") || "Active",
  };
}

export function mapZohoPeopleDepartmentName(row: Record<string, unknown>) {
  return field(row, "Department", "DepartmentName", "Department_Name", "Name", "DepartmentName.Name");
}

function isRetryableFormError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes("form") &&
    (lower.includes("invalid") ||
      lower.includes("not found") ||
      lower.includes("does not exist") ||
      lower.includes("check the form name"))
  );
}

export async function fetchZohoPeopleFormRecords(
  fetchJson: (path: string) => Promise<unknown>,
  formNames: string[]
) {
  let lastError: unknown = null;

  for (const form of formNames) {
    try {
      const rows: Record<string, unknown>[] = [];
      let sIndex = 1;
      for (let page = 0; page < 10; page++) {
        const data = await fetchJson(
          `/people/api/forms/${encodeURIComponent(form)}/getRecords?sIndex=${sIndex}&limit=200`
        );
        const batch = flattenZohoPeopleRecords(data);
        if (batch.length === 0) break;
        rows.push(...batch);
        if (batch.length < 200) break;
        sIndex += batch.length;
      }
      return rows;
    } catch (error) {
      lastError = error;
      if (!isRetryableFormError(error)) throw error;
    }
  }

  if (lastError) throw lastError;
  return [];
}

export async function fetchZohoPeopleCount(
  fetchJson: (path: string) => Promise<unknown>,
  path: string
) {
  try {
    const data = await fetchJson(path);
    const rows = flattenZohoPeopleRecords(data);
    if (rows.length > 0) return rows.length;
    const root = asRecord(data);
    const response = asRecord(root?.response);
    const result = response?.result ?? root?.data ?? root?.result;
    if (Array.isArray(result)) return result.length;
    return 0;
  } catch {
    return 0;
  }
}
