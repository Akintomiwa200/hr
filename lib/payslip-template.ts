import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import type { PayrollLineItem } from "@/lib/payroll-types";

export type PayslipDocumentData = {
  id: string;
  companyName: string;
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
  const { earnings, deductions, grossPay, totalDeductions, netPay } = payslipTotals(data.items);
  const invoiceNo = payslipNumber(data.id);
  const issueDate = data.paidAt ?? data.createdAt ?? new Date();

  const row = (item: PayrollLineItem, index: number) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:12px;">${String(index + 1).padStart(2, "0")}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;">
        <div style="font-weight:600;color:#111827;">${item.label}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${categoryTag(item.category)}${item.auto ? " · Auto-calculated" : ""}</div>
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700;color:${item.type === "EARNING" ? "#059669" : "#dc2626"};">
        ${item.type === "DEDUCTION" ? "−" : "+"}${formatCurrency(item.amount)}
      </td>
    </tr>`;

  const section = (title: string, rows: PayrollLineItem[], empty: string) => `
    <div style="margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7B61FF;margin-bottom:8px;">${title}</div>
      <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 16px;text-align:left;font-size:11px;color:#6b7280;width:48px;">#</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;color:#6b7280;">Description</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;color:#6b7280;width:140px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length > 0 ? rows.map(row).join("") : `<tr><td colspan="3" style="padding:20px;text-align:center;color:#9ca3af;">${empty}</td></tr>`}
        </tbody>
      </table>
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payslip ${invoiceNo} — ${fullName(data.employee.firstName, data.employee.lastName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #111827; margin: 0; background: #f3f4f6; }
    .page { max-width: 820px; margin: 32px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,.08); }
    .accent { height: 6px; background: linear-gradient(90deg, #7B61FF, #4f46e5); }
    .body { padding: 40px; }
    .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 32px; }
    .brand { font-size: 28px; font-weight: 800; color: #7B61FF; letter-spacing: -0.02em; }
    .invoice-title { font-size: 13px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #6b7280; }
    .invoice-no { font-size: 22px; font-weight: 800; color: #111827; margin-top: 4px; }
    .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 28px; }
    .meta-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; }
    .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #9ca3af; }
    .meta-value { font-size: 14px; font-weight: 600; color: #111827; margin-top: 4px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
    .party { border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; }
    .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #7B61FF; margin-bottom: 10px; }
    .party-name { font-size: 17px; font-weight: 700; }
    .party-meta { font-size: 13px; color: #6b7280; margin-top: 6px; line-height: 1.5; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-top: 8px; }
    .totals { width: 320px; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
    .totals-row { display: flex; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .totals-row.deduction span:last-child { color: #dc2626; font-weight: 600; }
    .totals-row.net { background: linear-gradient(135deg, #ecfdf5, #f0fdf4); border-bottom: none; padding: 18px; }
    .totals-row.net span:first-child { font-weight: 700; color: #065f46; }
    .net-amount { font-size: 26px; font-weight: 800; color: #059669; }
    .notes { margin-top: 28px; padding: 18px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px dashed #d1d5db; font-size: 11px; color: #9ca3af; text-align: center; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-processed { background: #dbeafe; color: #1e40af; }
    .status-draft { background: #f3f4f6; color: #4b5563; }
    @media print {
      body { background: #fff; }
      .page { margin: 0; box-shadow: none; border-radius: 0; max-width: none; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;padding:16px;">
    <button onclick="window.print()" style="padding:12px 20px;background:#7B61FF;color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer;">Print / Save as PDF</button>
  </div>
  <div class="page">
    <div class="accent"></div>
    <div class="body">
      <div class="header">
        <div>
          <div class="brand">${data.companyName}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:4px;">Salary payment receipt</div>
        </div>
        <div style="text-align:right;">
          <div class="invoice-title">Payslip / Invoice</div>
          <div class="invoice-no">${invoiceNo}</div>
          <div style="margin-top:10px;">
            <span class="status status-${data.status.toLowerCase()}">${data.status}</span>
          </div>
        </div>
      </div>

      <div class="meta">
        <div class="meta-item"><div class="meta-label">Pay period</div><div class="meta-value">${formatDate(data.periodStart)} – ${formatDate(data.periodEnd)}</div></div>
        <div class="meta-item"><div class="meta-label">Issue date</div><div class="meta-value">${formatDate(issueDate)}</div></div>
        <div class="meta-item"><div class="meta-label">Employee ID</div><div class="meta-value">${data.employee.employeeCode}</div></div>
        <div class="meta-item"><div class="meta-label">Department</div><div class="meta-value">${data.employee.department}</div></div>
      </div>

      <div class="parties">
        <div class="party">
          <div class="party-label">From (Employer)</div>
          <div class="party-name">${data.companyName}</div>
          <div class="party-meta">Payroll &amp; Compensation<br/>Generated via Smart HR Payroll</div>
        </div>
        <div class="party">
          <div class="party-label">Pay to (Employee)</div>
          <div class="party-name">${fullName(data.employee.firstName, data.employee.lastName)}</div>
          <div class="party-meta">${data.employee.jobTitle}<br/>ID: ${data.employee.employeeCode}</div>
        </div>
      </div>

      ${section("Earnings", earnings, "No earnings recorded")}
      ${section("Deductions", deductions, "No deductions recorded")}

      <div class="totals-wrap">
        <div class="totals">
          <div class="totals-row"><span>Gross earnings</span><strong>${formatCurrency(grossPay)}</strong></div>
          <div class="totals-row deduction"><span>Total deductions</span><span>−${formatCurrency(totalDeductions)}</span></div>
          <div class="totals-row net"><span>Net pay</span><span class="net-amount">${formatCurrency(netPay)}</span></div>
        </div>
      </div>

      ${data.notes ? `<div class="notes"><strong style="display:block;margin-bottom:6px;color:#92400e;">Notes</strong>${data.notes}</div>` : ""}

      <div class="footer">
        This document is a computer-generated payslip. Amounts in USD. Retain for your records.<br/>
        ${invoiceNo} · ${formatDate(new Date())}
      </div>
    </div>
  </div>
</body>
</html>`;
}
