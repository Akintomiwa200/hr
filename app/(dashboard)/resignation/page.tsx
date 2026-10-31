import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { ResignationModule } from "@/components/resignation/resignation-module";
import {
  canViewResignations,
  isResignationAdmin,
} from "@/lib/resignation/access";
import {
  resignationListInclude,
  resignationScopeWhere,
} from "@/lib/resignation/queries";
import { RESIGNATION_ACTIVE_STATUSES } from "@/lib/resignation/service";
import { getResignationSettings } from "@/lib/resignation-settings";

export default async function ResignationPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewResignations(session.role)) redirect("/dashboard");

  const role = normalizeRole(session.role);
  const admin = isResignationAdmin(role);
  const teamLead = role === "MANAGER" || role === "SUPERVISOR";

  const [resignations, settings] = await Promise.all([
    prisma.resignation.findMany({
      where: resignationScopeWhere(session),
      include: resignationListInclude,
      orderBy: [{ createdAt: "desc" }],
    }),
    getResignationSettings(session.companyId),
  ]);

  const ownActive = session.employeeId
    ? resignations.some(
        (row) =>
          row.employeeId === session.employeeId &&
          (RESIGNATION_ACTIVE_STATUSES as readonly string[]).includes(row.status)
      )
    : false;

  const mode = admin ? "org" : teamLead ? "team" : "self";
  const title = admin ? "Resignation management" : teamLead ? "Team resignations" : "My resignation";
  const description = admin
    ? "Review resignations, adjust last working days, and hand exits to offboarding."
    : teamLead
      ? "Endorse resignations for your reports and track your own notice period."
      : "Submit a resignation and track your notice period and approvals.";

  return (
    <div>
      <PageLiveRefresh types={["resignation_updated", "employee_updated"]} />
      <PageHeader
        title={title}
        description={description}
        action={
          <div className="flex items-center gap-2">
            {admin && (
              <Link
                href="/settings/resignation"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            )}
            <ModulePageActions helpSlug="resignation" helpLabel="Resignation guide" />
          </div>
        }
      />
      <ResignationModule
        resignations={resignations}
        noticePeriodDays={settings.noticePeriodDays}
        allowWithdrawal={settings.allowWithdrawal}
        canSubmit={Boolean(session.employeeId) && !ownActive}
        currentEmployeeId={session.employeeId}
        isAdmin={admin}
        mode={mode}
      />
    </div>
  );
}
