import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";

function formatDateTime(value: Date) {
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CompanyActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!company) notFound();

  const logs = await prisma.auditLog.findMany({
    where: { companyId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-[13px] font-semibold text-gray-900">Activity log</h2>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Latest 100 audited actions for this company.
          </p>
        </div>
        <Badge variant="info">{logs.length} events</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3 font-semibold">When</th>
              <th className="px-5 py-3 font-semibold">Actor</th>
              <th className="px-5 py-3 font-semibold">Action</th>
              <th className="px-5 py-3 font-semibold">Module</th>
              <th className="px-5 py-3 font-semibold">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50/60">
                <td className="whitespace-nowrap px-5 py-3 text-[12px] text-gray-500">
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
                  <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                    {log.module}
                  </span>
                </td>
                <td className="max-w-[240px] truncate px-5 py-3 text-[12px] text-gray-500">
                  {log.entityLabel ?? "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500">
                  No activity recorded for this company yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
