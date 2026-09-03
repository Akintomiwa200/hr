import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Shield, UserRound } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageOrgContent } from "@/lib/roles";
import type { Role } from "@prisma/client";

export default async function SecuritySettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const employee = session.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: { id: true },
      })
    : null;

  const canAccessHelp = canManageOrgContent(session.role as Role);

  return (
    <div>
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-brand-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Account security</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Access, permissions, and personal account links.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
            <Shield className="w-5 h-5 text-violet-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Access</h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Email and role changes are handled by your HR administrator. For access issues, contact support.
          </p>
          {canAccessHelp ? (
            <Link
              href="/help/roles-permissions"
              className="text-sm font-medium text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
            >
              Roles guide <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <p className="text-xs text-gray-400">Contact your HR administrator for access help.</p>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center mb-4">
            <UserRound className="w-5 h-5 text-sky-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Employee profile</h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            View attendance, leave, and payroll from your employee profile pages in the directory.
          </p>
          {employee ? (
            <Link
              href={`/employees/${employee.id}`}
              className="text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              Open my profile
            </Link>
          ) : canAccessHelp ? (
            <Link
              href="/help/employees"
              className="text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              Employees guide
            </Link>
          ) : null}
        </section>
      </div>
    </div>
  );
}