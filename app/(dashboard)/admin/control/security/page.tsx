import Link from "next/link";
import {
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import {
  formatPlatformDate,
  platformAdminName,
  platformStatusClass,
  requirePlatformAdmin,
} from "@/lib/platform-control";

export default async function PlatformSecurityPage() {
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
  const mfaRequired = process.env.MFA_REQUIRED === "true";
  const ipAllowlist = Boolean(
    process.env.IP_ALLOWLIST || process.env.ALLOWED_IPS
  );
  const sessionSecret = Boolean(process.env.JWT_SECRET);
  const webhookSecret = Boolean(process.env.SELAR_WEBHOOK_TOKEN);

  const controls = [
    {
      title: "Multi-factor authentication",
      detail: mfaRequired
        ? "MFA is required by the deployment environment."
        : "MFA is not required by the deployment environment.",
      status: mfaRequired ? "ENABLED" : "NOT CONFIGURED",
    },
    {
      title: "IP allowlisting",
      detail: ipAllowlist
        ? "An IP allowlist is present in the deployment environment."
        : "IP allowlisting is not configured in application settings.",
      status: ipAllowlist ? "ENABLED" : "NOT CONFIGURED",
    },
    {
      title: "Session signing secret",
      detail: sessionSecret
        ? "JWT_SECRET is configured for signed sessions."
        : "JWT_SECRET is not configured; the development fallback is in use.",
      status: sessionSecret ? "CONFIGURED" : "NOT CONFIGURED",
    },
    {
      title: "Payment webhook secret",
      detail: webhookSecret
        ? "SELAR_WEBHOOK_TOKEN is configured for payment callbacks."
        : "SELAR_WEBHOOK_TOKEN is missing; payment callbacks cannot be verified.",
      status: webhookSecret ? "CONFIGURED" : "NOT CONFIGURED",
    },
  ];

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh
        types={["settings_updated", "audit_updated", "dashboard_updated"]}
      />
      <PageHeader
        title="Security & IP access"
        description="Platform administrator access and deployment security controls."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Platform staff" value={staff.length} icon={Users} />
        <StatCard label="Active accounts" value={active.length} icon={CheckCircle2} />
        <StatCard
          label="MFA"
          value={mfaRequired ? "Required" : "Optional"}
          icon={ShieldCheck}
        />
        <StatCard
          label="IP allowlist"
          value={ipAllowlist ? "Configured" : "Not set"}
          icon={LockKeyhole}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-[13px] font-semibold text-gray-900">
              Deployment controls
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Signals read from the current environment.
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {controls.map((control) => (
              <div
                key={control.title}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-gray-900">
                    {control.title}
                  </p>
                  <p className="mt-1 break-words text-xs text-gray-500">
                    {control.detail}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${platformStatusClass(
                    control.status
                  )}`}
                >
                  {control.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-[13px] font-semibold text-gray-900">
              Platform administrators
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Accounts that can reach every tenant.
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
                No platform administrators exist yet.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-amber-900">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
        IP allowlisting and MFA are deployment-level controls. Configure them in
        your hosting environment; they are not editable from the platform
        console.
      </div>
    </div>
  );
}
