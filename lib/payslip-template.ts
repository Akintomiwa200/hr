import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import { DEFAULT_CURRENCY, getCurrencyMeta } from "@/lib/currency";
import type { PayrollLineItem } from "@/lib/payroll-types";

export type PayslipDocumentData = {
  id: string;
  companyName: string;
  companyLogo?: string | null;
  currencyCode?: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    jobTitle: string;
    department: string;
  };
  periodStart: Date | string;
  periodEnd: Date | string;
  status: string;
  items: PayrollLineItem[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  notes?: string | null;
  paidAt?: Date | string | null;
  createdAt?: Date | string | null;
  payeeLabel?: string;
  isOwnPayslip?: boolean;
  receiptKind?: string;
  documentSubtitle?: string;
};

export function payslipNumber(id: string) {
  return `PS-${id.slice(-8).toUpperCase()}`;
}

export function payslipTotals(items: PayrollLineItem[]) {
  const earnings = items.filter((item) => item.type === "EARNING");
  const deductions = items.filter((item) => item.type === "DEDUCTION");
  const grossPay = earnings.reduce((sum, item) => sum + item.amount, 0);
  const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);
  return { earnings, deductions, grossPay, totalDeductions, netPay: grossPay - totalDeductions };
}

export function categoryTag(category: PayrollLineItem["category"]) {
  const labels: Record<PayrollLineItem["category"], string> = {
    BASE_SALARY: "Salary",
    BONUS: "Bonus",
    HOLIDAY_ALLOWANCE: "Allowance",
    OVERTIME: "Overtime",
    LATENESS: "Attendance",
    ABSENCE: "Attendance",
    DAMAGE: "Deduction",
    TAX: "Tax",
    OTHER: "Other",
  };
  return labels[category] ?? "Other";
}

export function renderPayslipHtml(data: PayslipDocumentData) {
  const currencyCode = data.currencyCode || DEFAULT_CURRENCY;
  const currency = getCurrencyMeta(currencyCode);
  const money = (amount: number) => formatCurrency(amount, currencyCode);
  const { earnings, deductions } = payslipTotals(data.items);
  const invoiceNo = payslipNumber(data.id);
  const issueDate = data.paidAt ?? data.createdAt ?? new Date();
  const employeeName = fullName(data.employee.firstName, data.employee.lastName);
  const payeeName = data.payeeLabel || employeeName;
  const payeeTitle = data.isOwnPayslip ? "Pay to (You)" : "Pay to (Employee)";
  const periodLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(data.periodStart));

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; bg: string; fg: string }> = {
      PAID: { label: "Paid", bg: "#d1fae5", fg: "#065f46" },
      PROCESSED: { label: "Processed", bg: "#dbeafe", fg: "#1e40af" },
      DRAFT: { label: "Draft", bg: "#f3f4f6", fg: "#4b5563" },
      ISSUED: { label: "Issued", bg: "#dbeafe", fg: "#1e40af" },
      ACKNOWLEDGED: { label: "Acknowledged", bg: "#d1fae5", fg: "#065f46" },
    };
    const cfg = map[status] || { label: status, bg: "#f3f4f6", fg: "#4b5563" };
    return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;background:${cfg.bg};color:${cfg.fg};">${cfg.label}</span>`;
  };

  const metaRow = (label: string, value: string) => `
    <div style="border:1px solid #f3f4f6;background:#f9fafb;border-radius:12px;padding:8px 10px;min-width:0;">
      <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;">${label}</p>
      <p style="margin:2px 0 0;font-size:13px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${value}</p>
    </div>`;

  const lineRow = (item: PayrollLineItem, index: number) => {
    const amount = `${item.type === "DEDUCTION" ? "−" : "+"}${money(item.amount)}`;
    const color = item.type === "DEDUCTION" ? "#dc2626" : "#059669";
    return `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:8px 14px;color:#9ca3af;font-size:12px;white-space:nowrap;">#${(index + 1).toString().padStart(2, "0")}</td>
      <td style="padding:8px 14px;">
        <p style="margin:0;font-weight:600;color:#111827;font-size:14px;">${item.label}</p>
        <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;">${categoryTag(item.category)}${item.auto ? " · Auto-calculated" : ""}</p>
      </td>
      <td style="padding:8px 14px;text-align:right;font-weight:700;color:${color};font-size:14px;white-space:nowrap;">${amount}</td>
    </tr>`;
  };

  const section = (title: string, rows: PayrollLineItem[], empty: string) => `
    <div style="margin-bottom:20px;">
      <h3 style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#7c3aed;">${title}</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
            <th style="text-align:left;padding:8px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;width:56px;">#</th>
            <th style="text-align:left;padding:8px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;">Description</th>
            <th style="text-align:right;padding:8px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;width:140px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map(lineRow).join("") : `<tr><td colspan="3" style="padding:32px;text-align:center;color:#9ca3af;font-size:14px;">${empty}</td></tr>`}
        </tbody>
      </table>
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Payslip ${invoiceNo} — ${employeeName}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #111827; background: #f3f4f6; }
  .page { max-width: 860px; margin: 24px auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,.06); }
  .accent { height: 6px; background: linear-gradient(90deg, #7b61ff, #7c3aed, #4f46e5); }
  .inner { padding: 18px 22px 20px; }
  .badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:700; text-transform:uppercase; }
  @media print {
    body { background: #fff; }
    .page { margin: 0; border: none; box-shadow: none; border-radius: 0; max-width: none; }
  }
  html, body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
</style>
</head>
<body>
  <div class="page">
    <div class="accent"></div>
    <div class="inner">
      <!-- Header -->
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:20px;margin-bottom:24px;">
        <div>
          <div style="display:flex;align-items:center;gap:12px;">
            ${data.companyLogo ? `<img src="${data.companyLogo}" alt="${data.companyName}" style="width:48px;height:48px;border-radius:12px;object-fit:contain;background:#fff;padding:4px;border:1px solid #f3f4f6;" />` : ""}
            <p style="margin:0;font-size:24px;font-weight:800;color:#6b51ef;letter-spacing:-0.02em;">${data.companyName}</p>
          </div>
          <p style="margin:4px 0 0;font-size:14px;color:#6b7280;">${data.receiptKind || "Salary payment receipt"}</p>
          ${data.documentSubtitle ? `<p style="margin:2px 0 0;font-size:12px;color:#9ca3af;">${data.documentSubtitle}</p>` : ""}
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:#9ca3af;">Payslip</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:#111827;font-family:ui-monospace,monospace;">${invoiceNo}</p>
          <div style="margin-top:12px;">${statusBadge(data.status)}</div>
        </div>
      </div>

      <!-- Period banner -->
      <div style="margin-bottom:24px;border:1px solid #e8e3ff;background:#f3f0ff;text-align:center;border-radius:12px;padding:10px 16px;">
        <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:#6b51ef;">Salary Slip for</p>
        <p style="margin:2px 0 0;font-size:20px;font-weight:800;color:#111827;">${periodLabel}</p>
      </div>

      <!-- Meta grid -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">
        ${metaRow("Pay period", `${formatDate(data.periodStart)} – ${formatDate(data.periodEnd)}`)}
        ${metaRow("Issue date", formatDate(issueDate))}
        ${metaRow("Employee ID", data.employee.employeeCode)}
        ${metaRow("Department", data.employee.department)}
      </div>

      <!-- Parties -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
          <p style="margin:0 0 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#7c3aed;">From (Employer)</p>
          <p style="margin:0;font-weight:700;color:#111827;font-size:15px;">${data.companyName}</p>
          <p style="margin:4px 0 0;font-size:14px;color:#6b7280;">Payroll &amp; Compensation</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
          <p style="margin:0 0 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#7c3aed;">${payeeTitle}</p>
          <p style="margin:0;font-weight:700;color:#111827;font-size:15px;">${payeeName}</p>
          <p style="margin:4px 0 0;font-size:14px;color:#6b7280;">${data.employee.jobTitle}<br/>ID: ${data.employee.employeeCode}</p>
        </div>
      </div>

      ${section("Earnings", earnings, "No earnings on this payslip")}
      ${section("Deductions", deductions, "No deductions on this payslip")}

      <!-- Totals -->
      <div style="display:flex;justify-content:flex-end;margin-bottom:20px;">
        <div style="width:100%;max-width:340px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;">
            <span style="color:#4b5563;">Gross earnings</span>
            <strong style="color:#111827;">${money(data.grossPay)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;">
            <span style="color:#4b5563;">Total deductions</span>
            <strong style="color:#dc2626;">−${money(data.totalDeductions)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:linear-gradient(90deg,#ecfdf5,#f0fdf4);">
            <span style="font-weight:700;color:#065f46;">Net pay</span>
            <span style="font-size:22px;font-weight:800;color:#059669;">${money(data.netPay)}</span>
          </div>
        </div>
      </div>

      ${data.notes ? `
      <div style="border:1px solid #fde68a;background:#fffbeb;border-radius:12px;padding:14px;margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#92400e;">Notes</p>
        <p style="margin:0;font-size:14px;color:#78350f;line-height:1.5;">${data.notes}</p>
      </div>` : ""}

      <!-- Footer -->
      <div style="border-top:1px dashed #d1d5db;padding-top:16px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
          Computer-generated payslip · All amounts in ${currency.code} · Retain for your records
          <br/>
          <span style="font-family:ui-monospace,monospace;color:#6b7280;">${invoiceNo}</span> · ${formatDate(new Date())}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}