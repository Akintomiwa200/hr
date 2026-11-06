import Link from "next/link";
import { Activity, Building2, Clock3, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import {
  formatPlatformDateTime,
  platformStatusClass,
  platformStatusLabel,
  requirePlatformAdmin,
} from "@/lib/platform-control";

export default async function PlatformAuditTrailPage() {
  await requirePlatformAdmin();

  const logs = await prisma.auditLog.findMany({
    where: { actorRole: "SUPER_ADMIN" },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const administrators = new Set(
    logs.map((log) => log.actorUserId ?? log.actorName)
  ).size;
  const companies = new Set(
    logs.map((log) => log.company?.name).filter(Boolean)
  ).size;
  const modules = new Set(logs.map((log) => log.module)).size;

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh
        types={["audit_updated", "dashboard_updated", "settings_updated"]}
      />
      <PageHeader
        title="Super Admin audit trail"
        description="Every action performed by platform administrators, newest first and live."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recorded events" value={logs.length} icon={Activity} />
        <StatCard label="Administrators" value={administrators} icon={Users} />
        <StatCard label="Companies touched" value={companies} icon={Building2} />
        <StatCard label="Modules covered" value={modules} icon={Clock3} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">
              Platform administrator actions
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {logs.length
                ? `${logs.length} events · refreshed automatically when the platform changes`
                : "No platform administrator actions have been recorded yet."}
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
            LIVE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Administrator</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Module</th>
                <th className="px-5 py-3 font-semibold">Company</th>
                <th className="px-5 py-3 font-semibold">Entity</th>
                <th className="px-5 py-3 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/60">
                  <td className="whitespace-nowrap px-5 py-3 text-[12px] text-gray-500">
                    {formatPlatformDateTime(log.createdAt)}
                  </td>
                  <td className="px-5 py-3">
                    {log.actorUserId ? (
                      <Link
                        href={`/admin/users/${log.actorUserId}`}
                        className="text-[12.5px] font-medium text-gray-900 hover:text-violet-700"
                      >
                        {log.actorName}
                      </Link>
                    ) : (
                      <p className="text-[12.5px] font-medium text-gray-900">
                        {log.actorName}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-500">
                      {log.actorRole ?? "SUPER_ADMIN"}
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
                    {log.company ? (
                      <Link
                        href={`/admin/companies/${log.company.id}`}
                        className="hover:text-violet-700"
                      >
                        {log.company.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">Platform</span>
                    )}
                  </td>
                  <td className="max-w-[220px] truncate px-5 py-3 text-[12px] text-gray-500">
                    {log.entityLabel ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-[11px] text-gray-400">
                    {log.ipAddress ?? "—"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    Nothing has been recorded yet. New administrator actions
                    appear here in real time.
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
