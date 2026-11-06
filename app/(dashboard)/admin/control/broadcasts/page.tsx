import { Clock3, Megaphone, MessageSquare, Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { PlatformBroadcastComposer } from "@/components/admin/platform-broadcast-composer";
import {
  formatPlatformDateTime,
  platformStatusClass,
  requirePlatformAdmin,
} from "@/lib/platform-control";

export default async function PlatformBroadcastsPage() {
  await requirePlatformAdmin();

  const broadcasts = await prisma.announcement.findMany({
    where: { companyId: null },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const urgent = broadcasts.filter(
    (broadcast) => broadcast.priority === "URGENT"
  ).length;
  const high = broadcasts.filter(
    (broadcast) => broadcast.priority === "HIGH"
  ).length;

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh
        types={["announcement_created", "notification_updated", "dashboard_updated"]}
      />
      <PageHeader
        title="System broadcasts"
        description="Platform-wide announcements visible to every active tenant."
        action={<PlatformBroadcastComposer />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Platform broadcasts" value={broadcasts.length} icon={Megaphone} />
        <StatCard label="Urgent" value={urgent} icon={Zap} />
        <StatCard label="High priority" value={high} icon={MessageSquare} />
        <StatCard
          label="Latest broadcast"
          value={broadcasts[0] ? formatPlatformDateTime(broadcasts[0].createdAt) : "—"}
          icon={Clock3}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">
              Broadcast history
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {broadcasts.length
                ? `${broadcasts.length} notices · new broadcasts appear instantly`
                : "No platform broadcasts have been published yet."}
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
            LIVE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-semibold">Broadcast</th>
                <th className="px-5 py-3 font-semibold">Priority</th>
                <th className="px-5 py-3 font-semibold">Author</th>
                <th className="px-5 py-3 font-semibold">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {broadcasts.map((broadcast) => (
                <tr key={broadcast.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3">
                    <p className="text-[12.5px] font-medium text-gray-900">
                      {broadcast.title}
                    </p>
                    <p className="max-w-[420px] truncate text-[11px] text-gray-500">
                      {broadcast.content}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${platformStatusClass(
                        broadcast.priority
                      )}`}
                    >
                      {broadcast.priority}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600">
                    {broadcast.author}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-[12px] text-gray-500">
                    {formatPlatformDateTime(broadcast.createdAt)}
                  </td>
                </tr>
              ))}
              {broadcasts.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    <Megaphone className="mx-auto mb-3 h-6 w-6 text-gray-300" />
                    Publish the first platform notice with the button above.
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
