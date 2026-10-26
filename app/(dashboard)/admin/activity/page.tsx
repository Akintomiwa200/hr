import { redirect } from "next/navigation";
import { Building2, Clock, ScrollText } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";

function formatDateTime(value: Date) {
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PlatformActivityPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({
    include: { company: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const companyCount = new Set(logs.map((log) => log.company?.name).filter(Boolean)).size;

  return (
    <div className="w-full">
      <PageHeader
        title="Activity log"
        description="The latest audited actions taken across every company on the platform."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Recent events" value={logs.length} icon={ScrollText} />
        <StatCard label="Companies active" value={companyCount} icon={Building2} />
        <StatCard
          label="Last event"
          value={logs[0] ? formatDateTime(logs[0].createdAt) : "—"}
          icon={Clock}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-[13px] font-semibold text-gray-900">Cross-company activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
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
                  <td className="px-5 py-3 text-[12px] text-gray-500 whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-[12.5px] font-medium text-gray-900">{log.actorName}</p>
                    {log.actorRole && (
                      <p className="text-[11px] text-gray-500">{log.actorRole}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-700">{log.action}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-violet-50 text-violet-700">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600">
                    {log.company?.name ?? <span className="text-gray-400">Platform</span>}
                  </td>
                  <td className="px-5 py-3 text-[12px] text-gray-500 max-w-[220px] truncate">
                    {log.entityLabel ?? "—"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500">
                    No activity recorded yet.
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
