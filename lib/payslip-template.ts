import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import type { PayrollLineItem } from "@/lib/payroll-types";

type PayslipData = {
  companyName: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    jobTitle: string;
    department: string;
  };
  periodStart: Date;
  periodEnd: Date;
  status: string;
  items: PayrollLineItem[];
  grossPay: number;
  deductions: number;
  netPay: number;
  notes?: string | null;
};

export function renderPayslipHtml(data: PayslipData) {
  const earnings = data.items.filter((item) => item.type === "EARNING");
  const deductions = data.items.filter((item) => item.type === "DEDUCTION");

  const row = (item: PayrollLineItem) => `
    <tr>
      <td>${item.label}${item.auto ? ' <span style="color:#7B61FF;font-size:11px;">(auto)</span>' : ""}</td>
      <td style="text-align:right;font-weight:600;">${formatCurrency(item.amount)}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payslip - ${fullName(data.employee.firstName, data.employee.lastName)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 40px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 32px; }
    .brand { font-size: 24px; font-weight: 700; color: #7B61FF; }
    .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; margin-bottom: 20px; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    h2 { font-size: 14px; margin: 0 0 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .summary { background: #f5f3ff; border-radius: 12px; padding: 16px; }
    .summary-row { display:flex; justify-content:space-between; margin-bottom: 8px; }
    .net { font-size: 22px; font-weight: 700; color: #059669; }
    @media print { body { margin: 20px; } button { display:none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${data.companyName}</div>
      <h1>Payslip</h1>
      <p style="color:#6b7280;margin:0;">${formatDate(data.periodStart)} – ${formatDate(data.periodEnd)}</p>
    </div>
    <div style="text-align:right;color:#6b7280;font-size:13px;">
      <div>Status: ${data.status}</div>
      <div>Generated: ${formatDate(new Date())}</div>
    </div>
  </div>

  <div class="card">
    <h2>Employee</h2>
    <p style="margin:0;font-size:16px;font-weight:600;">${fullName(data.employee.firstName, data.employee.lastName)}</p>
    <p style="margin:4px 0 0;color:#6b7280;">${data.employee.jobTitle} · ${data.employee.department}</p>
    <p style="margin:4px 0 0;color:#6b7280;">Employee ID: ${data.employee.employeeCode}</p>
  </div>

  <div class="card">
    <h2>Earnings</h2>
    <table>${earnings.map(row).join("") || '<tr><td colspan="2">No earnings</td></tr>'}</table>
  </div>

  <div class="card">
    <h2>Deductions</h2>
    <table>${deductions.map(row).join("") || '<tr><td colspan="2">No deductions</td></tr>'}</table>
  </div>

  <div class="card summary">
    <div class="summary-row"><span>Gross pay</span><strong>${formatCurrency(data.grossPay)}</strong></div>
    <div class="summary-row"><span>Total deductions</span><strong>${formatCurrency(data.deductions)}</strong></div>
    <div class="summary-row net"><span>Net pay</span><span>${formatCurrency(data.netPay)}</span></div>
  </div>

  ${data.notes ? `<div class="card"><h2>Notes</h2><p style="margin:0;color:#4b5563;">${data.notes}</p></div>` : ""}

  <button onclick="window.print()" style="margin-top:16px;padding:10px 16px;background:#7B61FF;color:white;border:none;border-radius:10px;cursor:pointer;">Print / Save as PDF</button>
</body>
</html>`;
}
