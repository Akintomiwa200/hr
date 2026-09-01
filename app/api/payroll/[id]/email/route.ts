import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  notFound,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import { canViewPayrollRecord } from "@/lib/payroll-access";
import { legacyBreakdownFromRecord } from "@/lib/payroll-engine";
import { payslipNumber, renderPayslipHtml } from "@/lib/payslip-template";
import { htmlToPdf } from "@/lib/pdf/render-payslip";
import { getAppCurrencyCode } from "@/lib/currency-server";
import { getAppUrl } from "@/lib/constants/auth";
import { deliverMail, emailFromAddress } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    to?: string;
    cc?: string;
    bcc?: string;
    message?: string;
  } | null;

  const toList = (value?: string) =>
    (value ?? "")
      .split(/[,\s;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  const cc = toList(body?.cc);
  const bcc = toList(body?.bcc);

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

  const to = (body?.to ?? record.employee.email ?? "").trim();
  if (!to) {
    return badRequest(
      "Recipient email is missing and this employee has no email on file."
    );
  }

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

  const companyName = company?.name ?? "Organization";
  const periodLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(record.periodStart));
  const subject = `Payslip ${payslipNumber(record.id)} — ${companyName} (${periodLabel})`;

  const html = renderPayslipHtml({
    id: record.id,
    companyName,
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

  const text = [
    `Dear ${record.employee.firstName} ${record.employee.lastName},`,
    "",
    `${companyName} has issued your payslip for ${periodLabel}.`,
    body?.message ?? "",
    "",
    "Your payslip PDF is attached — open it to print or save.",
    "",
    `Download payslip: ${getAppUrl()}/api/payroll/${record.id}/payslip`,
  ]
    .filter(Boolean)
    .join("\n");

  const filename = `payslip-${record.employee.employeeCode}-${record.periodStart.toISOString().slice(0, 7)}.pdf`;

  const pdf = await htmlToPdf(html);

  const result = await deliverMail({
    from: emailFromAddress(),
    to,
    ...(cc.length ? { cc } : {}),
    ...(bcc.length ? { bcc } : {}),
    subject,
    html,
    text,
    attachments: [
      {
        filename,
        contentType: "application/pdf",
        content: Buffer.from(pdf),
      },
    ],
  });

  if (!result.sent) {
    return NextResponse.json(
      { error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json(result);
}