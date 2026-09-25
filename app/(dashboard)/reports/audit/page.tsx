import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canViewOrgReports } from "@/lib/reports/access";
import {
  auditActions,
  auditModules,
  auditSummary,
  listAuditLogs,
} from "@/lib/audit";
import { ReportsBackLink } from "@/components/reports/report-detail-shell";
import { AuditModule } from "@/components/reports/audit-module";

export default async function AuditReportPage() {
  const session = await getSession();
  if (!session || !canViewOrgReports(session)) notFound();

  const filter = { companyId: session.companyId, limit: 100 };
  const [rows, summary] = await Promise.all([
    listAuditLogs(filter),
    auditSummary(filter),
  ]);

  return (
    <div className="mx-auto max-w-[1100px]">
      <ReportsBackLink label="Back to Reports" />

      <div className="mb-6 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-[13px] font-medium text-brand-600">
              List Report › Audit Reports
            </p>
            <h1 className="text-2xl font-bold text-gray-900">Activity audit trail</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Every sensitive action across your workspace — sign-ins, changes, approvals and
              exports — captured in a tamper-evident log.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[12.5px] font-medium text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Immutable log
          </div>
        </div>
      </div>

      <AuditModule
        initialRows={rows}
        initialSummary={summary}
        modules={auditModules}
        actions={auditActions}
      />
    </div>
  );
}