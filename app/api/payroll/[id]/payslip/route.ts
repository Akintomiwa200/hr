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
import { htmlToPdf } from "@/lib/pdf/render-payslip";
import { getAppCurrencyCode } from "@/lib/currency-server";

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
      employee: {
        include: {
          department: true,
          user: { select: { companyId: true } },
        },
      },
    },
  });
  if (!record) return notFound();

  const allowed = await canViewPayrollRecord(session, record);
  if (!allowed) return forbidden();

  const items = legacyBreakdownFromRecord(record);
  const [company, currencyCode] = await Promise.all([
    record.employee.user?.companyId
      ? prisma.company.findUnique({
          where: { id: record.employee.user.companyId },
          select: { name: true, logo: true },
        })
      : Promise.resolve(null),
    getAppCurrencyCode(),
  ]);

  const html = renderPayslipHtml({
    id: record.id,
    companyName: company?.name ?? "Organization",
    companyLogo: company?.logo ?? null,
    currencyCode,
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

  const pdf = await htmlToPdf(html);

  const filename = `payslip-${record.employee.employeeCode}-${record.periodStart.toISOString().slice(0, 7)}.pdf`;

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
