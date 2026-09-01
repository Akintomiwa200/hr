import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { PayslipDetailModule } from "@/components/payroll/payslip-detail-module";
import {
  canManagePayrollRecord,
  canViewPayrollRecord,
} from "@/lib/payroll-access";
import { legacyBreakdownFromRecord } from "@/lib/payroll-engine";
import { getPayslipViewerContext } from "@/lib/payslip-viewer";

export default async function PayslipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const [record, company] = await Promise.all([
    prisma.payrollRecord.findUnique({
      where: { id },
      include: {
        employee: { include: { department: true } },
      },
    }),
    session.companyId
      ? prisma.company.findUnique({
          where: { id: session.companyId },
          select: { name: true, logo: true },
        })
      : Promise.resolve(null),
  ]);
  if (!record) notFound();

  const allowed = await canViewPayrollRecord(session, record);
  if (!allowed) redirect("/payroll");

  const canManage = await canManagePayrollRecord(session, record);
  const breakdown = legacyBreakdownFromRecord(record);
  const viewer = getPayslipViewerContext(session, record, canManage);

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title={viewer.pageTitle}
          description={viewer.pageDescription}
          action={<ModulePageActions helpSlug="payroll" />}
        />
      </div>
      <PayslipDetailModule
        key={JSON.stringify([
          record.breakdown,
          record.notes,
          record.status,
          record.grossPay,
          record.deductions,
          record.netPay,
          record.paidAt,
        ])}
        record={record}
        breakdown={breakdown}
        canManage={canManage}
        viewer={viewer}
        companyName={company?.name ?? "Company"}
        companyLogo={company?.logo}
      />
    </div>
  );
}
