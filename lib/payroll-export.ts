export function escapeCsv(value: unknown) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  return [
    keys.join(","),
    ...rows.map((row) => keys.map((key) => escapeCsv(row[key])).join(",")),
  ].join("\n");
}

/** UTF-8 BOM so Excel opens CSV correctly. */
export function rowsToExcelCsv(rows: Record<string, unknown>[]) {
  return `\uFEFF${rowsToCsv(rows)}`;
}

export type PayrollExportRow = {
  employeeCode: string;
  employeeName: string;
  department: string;
  jobTitle: string;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  bonus: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: string;
  payrollRunId: string;
  recordId: string;
};

export function mapRecordToExportRow(record: {
  id: string;
  payrollRunId: string | null;
  periodStart: Date;
  periodEnd: Date;
  baseSalary: number;
  bonus: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: string;
  employee: {
    employeeCode: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    department?: { name: string } | null;
  };
}): PayrollExportRow {
  return {
    employeeCode: record.employee.employeeCode,
    employeeName: `${record.employee.firstName} ${record.employee.lastName}`.trim(),
    department: record.employee.department?.name ?? "",
    jobTitle: record.employee.jobTitle,
    periodStart: record.periodStart.toISOString().slice(0, 10),
    periodEnd: record.periodEnd.toISOString().slice(0, 10),
    baseSalary: record.baseSalary,
    bonus: record.bonus,
    grossPay: record.grossPay,
    deductions: record.deductions,
    netPay: record.netPay,
    status: record.status,
    payrollRunId: record.payrollRunId ?? "",
    recordId: record.id,
  };
}

export function payrollRegisterHtml(
  title: string,
  rows: PayrollExportRow[],
  currencyCode: string
) {
  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(n);
  const body = rows
    .map(
      (row, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${row.employeeCode}</td>
      <td>${row.employeeName}</td>
      <td>${row.department}</td>
      <td>${row.periodStart} – ${row.periodEnd}</td>
      <td>${fmt(row.grossPay)}</td>
      <td>${fmt(row.deductions)}</td>
      <td><strong>${fmt(row.netPay)}</strong></td>
      <td>${row.status}</td>
    </tr>`
    )
    .join("");
  const totals = rows.reduce(
    (acc, row) => ({
      gross: acc.gross + row.grossPay,
      deductions: acc.deductions + row.deductions,
      net: acc.net + row.netPay,
    }),
    { gross: 0, deductions: 0, net: 0 }
  );

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  p.meta { color: #666; font-size: 13px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
  th { background: #f9fafb; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  tfoot td { font-weight: 700; background: #f3f4f6; }
  @media print { body { padding: 0; } }
</style></head><body>
  <h1>${title}</h1>
  <p class="meta">${rows.length} employee(s) · Generated ${new Date().toLocaleString()}</p>
  <table>
    <thead><tr>
      <th>#</th><th>Code</th><th>Name</th><th>Department</th><th>Period</th>
      <th>Gross</th><th>Deductions</th><th>Net</th><th>Status</th>
    </tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr>
      <td colspan="5">Totals</td>
      <td>${fmt(totals.gross)}</td>
      <td>${fmt(totals.deductions)}</td>
      <td>${fmt(totals.net)}</td>
      <td></td>
    </tr></tfoot>
  </table>
  <p style="margin-top:24px;font-size:12px;color:#666">Open in browser and use Print → Save as PDF.</p>
</body></html>`;
}

export const PAYROLL_IMPORT_HEADERS = [
  "employeeCode",
  "email",
  "baseSalary",
  "bonus",
  "status",
  "notes",
] as const;

export function parsePayrollImportCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const cols = line.match(/("([^"]|"")*"|[^,]+)/g)?.map((cell) =>
      cell.replace(/^"|"$/g, "").replace(/""/g, '"').trim()
    ) ?? line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cols[index] ?? "";
    });
    return row;
  });
}
