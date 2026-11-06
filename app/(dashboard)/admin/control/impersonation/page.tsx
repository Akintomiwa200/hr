import Link from "next/link";
import { Activity, Building2, Clock3, ShieldAlert, UserSearch } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import {
  formatPlatformDateTime,
  platformStatusClass,
  platformStatusLabel,
  requirePlatformAdmin,
} from "@/lib/platform-control";

export default async function PlatformImpersonationPage() {
  await requirePlatformAdmin();

  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { module: "platform-context" },
        { module: { contains: "imperson", mode: "insensitive" } },
        { action: { contains: "imperson", mode: "insensitive" } },
        { entityLabel: { contains: "imperson", mode: "insensitive" } },
      ],
    },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const tenantIds = [...new Set(logs.map((log) => log.entityId).filter((id): id is string => Boolean(id)))];
  const tenantRows = tenantIds.length
    ? await prisma.company.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true } })
    : [];
  const tenantById = new Map(tenantRows.map((company) => [company.id, company]));

  const administrators = new Set(
    logs.map((log) => log.actorUserId ?? log.actorName)
  ).size;
  const companies = new Set(
    logs.map((log) => log.company?.name ?? tenantById.get(log.entityId ?? "")?.name).filter(Boolean)
  ).size;

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh
        types={["audit_updated", "dashboard_updated", "support_updated"]}
      />
      <PageHeader
        title="Company workspace access"
        description="Enter a tenant from its company profile, work in the company-admin workspace, and return to platform controls at any time."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Matching events" value={logs.length} icon={UserSearch} />
        <StatCard label="Administrators" value={administrators} icon={ShieldAlert} />
        <StatCard label="Companies" value={companies} icon={Building2} />
        <StatCard
          label="Latest event"
          value={logs[0] ? formatPlatformDateTime(logs[0].createdAt) : "—"}
          icon={Clock3}
        />
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-900">
        Platform workspace access is signed, limited to four hours, scoped to
        one active company at a time, and recorded in the platform audit trail.
        Tenant changes made through audited workflows are marked as platform
        support actions.
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">
              Company workspace access events
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {logs.length
                ? `${logs.length} matching records · live audit feed`
                : "No matching support-access events have been recorded."}
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
            LIVE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Actor</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Module</th>
                <th className="px-5 py-3 font-semibold">Company</th>
                <th className="px-5 py-3 font-semibold">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/60">
                  {(() => {
                    const tenant = log.company ?? tenantById.get(log.entityId ?? "");
                    return (
                      <>
                  <td className="whitespace-nowrap px-5 py-3 text-[12px] text-gray-500">
                    {formatPlatformDateTime(log.createdAt)}
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-[12.5px] font-medium text-gray-900">
                      {log.actorName}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {log.actorRole ?? "PLATFORM"}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${platformStatusClass(
                        log.action
                      )}`}
                    >
                      {platformStatusLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-700">
                    {log.module}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600">
                    {tenant ? (
                      <Link
                        href={`/admin/companies/${tenant.id}`}
                        className="hover:text-violet-700"
                      >
                        {tenant.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">Platform</span>
                    )}
                  </td>
                  <td className="max-w-[240px] truncate px-5 py-3 text-[12px] text-gray-500">
                    {log.entityLabel ?? "—"}
                  </td>
                      </>
                    );
                  })()}
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    <Activity className="mx-auto mb-3 h-6 w-6 text-gray-300" />
                    No impersonation-style events are present. The page will
                    update automatically if one is recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
