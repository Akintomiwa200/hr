import Link from "next/link";
import { CheckCircle2, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import {
  formatPlatformDate,
  platformAdminName,
  platformStatusClass,
  requirePlatformAdmin,
} from "@/lib/platform-control";

const PLATFORM_CAPABILITIES = [
  "Create, lock, and manage every tenant company",
  "Review cross-company activity and Super Admin audit trails",
  "Publish platform-wide broadcasts and notifications",
  "Configure global currency, billing links, and integrations",
  "Inspect tenant users, employee records, and support queues",
  "Monitor platform health, database capacity, and security posture",
];

export default async function PlatformPermissionsPage() {
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
    },
    orderBy: { createdAt: "asc" },
  });

  const active = staff.filter((member) => member.isActive && !member.archivedAt);

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh
        types={["settings_updated", "audit_updated", "dashboard_updated"]}
      />
      <PageHeader
        title="Super RBAC & permissions"
        description="Platform access is restricted to the built-in Super Admin role."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Platform roles" value={1} icon={ShieldCheck} />
        <StatCard label="Staff accounts" value={staff.length} icon={Users} />
        <StatCard label="Active accounts" value={active.length} icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[13px] font-semibold text-gray-900">
                Super Admin capabilities
              </h2>
              <p className="text-[11px] text-gray-500">
                Every platform account inherits this complete set.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2.5">
            {PLATFORM_CAPABILITIES.map((capability) => (
              <li
                key={capability}
                className="flex items-start gap-2.5 text-[12.5px] text-gray-700"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {capability}
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-[13px] font-semibold text-gray-900">
              Accounts with platform access
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Changes appear here automatically.
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {staff.map((member) => {
              const status = member.archivedAt
                ? "ARCHIVED"
                : member.isActive
                  ? "ACTIVE"
                  : "INACTIVE";
              return (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-gray-900">
                      {platformAdminName(member.preferences, member.email)}
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      {member.email} · added {formatPlatformDate(member.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${platformStatusClass(
                        status
                      )}`}
                    >
                      {status}
                    </span>
                    <Link
                      href={`/admin/users/${member.id}`}
                      className="text-[12px] font-semibold text-violet-700 hover:underline"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              );
            })}
            {staff.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-gray-500">
                No platform accounts exist yet.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-amber-900">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
        Granular platform roles and permission overrides are not stored in the
        current data model. Platform access is all-or-nothing through the Super
        Admin role.
      </div>
    </div>
  );
}
