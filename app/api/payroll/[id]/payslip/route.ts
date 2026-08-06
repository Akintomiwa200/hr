import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  forbidden,
  notFound,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import { canViewPayrollRecord } from "@/lib/payroll-access";
import { legacyBreakdownFromRecord } from "@/lib/payroll-engine";
import { renderPayslipHtml } from "@/lib/payslip-template";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const record = await prisma.payrollRecord.findUnique({
    where: { id },
    include: {
      employee: { include: { department: true } },
    },
  });
  if (!record) return notFound();

  const allowed = await canViewPayrollRecord(session, record);
  if (!allowed) return forbidden();

  const items = legacyBreakdownFromRecord(record);
  const html = renderPayslipHtml({
    id: record.id,
    companyName: "Smart HR",
    employee: {
      firstName: record.employee.firstName,
      lastName: record.employee.lastName,
      employeeCode: record.employee.employeeCode,
      jobTitle: record.employee.jobTitle,
      department: record.employee.department.name,
    },
    periodStart: record.periodStart,
    periodEnd: record.periodEnd,
    status: record.status,
    items,
    grossPay: record.grossPay || record.baseSalary + record.bonus,
    totalDeductions: record.deductions,
    netPay: record.netPay,
    notes: record.notes,
    paidAt: record.paidAt,
    createdAt: record.createdAt,
  });

  const filename = `payslip-${record.employee.employeeCode}-${record.periodStart.toISOString().slice(0, 7)}.html`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
