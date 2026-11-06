import Link from "next/link";
import { CheckCircle2, Clock3, ShieldCheck, UserPlus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import {
  formatPlatformDate,
  formatPlatformDateTime,
  platformAdminName,
  platformStatusClass,
  requirePlatformAdmin,
} from "@/lib/platform-control";

export default async function PlatformStaffPage() {
  await requirePlatformAdmin();

  const staff = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: {
      id: true,
      email: true,
      isActive: true,
      archivedAt: true,
      preferences: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const active = staff.filter((member) => member.isActive && !member.archivedAt);
  const inactive = staff.length - active.length;

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh
        types={["dashboard_updated", "settings_updated", "audit_updated"]}
      />
      <PageHeader
        title="Platform staff roster"
        description="Internal accounts that hold platform-wide Super Admin access."
        action={
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Users className="h-4 w-4" />
            User directory
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Platform staff" value={staff.length} icon={UserPlus} />
        <StatCard label="Active accounts" value={active.length} icon={CheckCircle2} />
        <StatCard label="Inactive accounts" value={inactive} icon={ShieldCheck} />
        <StatCard
          label="Newest account"
          value={staff[staff.length - 1] ? formatPlatformDate(staff[staff.length - 1].createdAt) : "—"}
          icon={Clock3}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">
              Super Admin accounts
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              These accounts are not tied to any company and can access every
              tenant.
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
            LIVE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-semibold">Administrator</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Added</th>
                <th className="px-5 py-3 font-semibold">Last updated</th>
                <th className="px-5 py-3 font-semibold">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staff.map((member) => {
                const status = member.archivedAt
                  ? "ARCHIVED"
                  : member.isActive
                    ? "ACTIVE"
                    : "INACTIVE";
                return (
                  <tr key={member.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <p className="text-[12.5px] font-medium text-gray-900">
                        {platformAdminName(member.preferences, member.email)}
                      </p>
                      <p className="text-[11px] text-gray-500">Platform Super Admin</p>
                    </td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-600">
                      {member.email}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${platformStatusClass(
                          status
                        )}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-[12px] text-gray-500">
                      {formatPlatformDate(member.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-[12px] text-gray-500">
                      {formatPlatformDateTime(member.updatedAt)}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/users/${member.id}`}
                        className="text-[12px] font-semibold text-violet-700 hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {staff.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    No platform staff accounts exist yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-900">
        Platform access is limited to the built-in Super Admin role. Creating or
        removing a platform administrator requires a secure provisioning step,
        which is not exposed from this screen.
      </div>
    </div>
  );
}
