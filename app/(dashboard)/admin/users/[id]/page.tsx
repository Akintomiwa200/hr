import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ExternalLink,
  Mail,
  Pencil,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fullName, formatDate } from "@/lib/utils";
import { roleLabel } from "@/lib/roles";
import { employmentLabel, resolveEmploymentType } from "@/lib/employment";
import { Avatar, Badge, Card, PageHeader, statusBadge } from "@/components/ui";
import { PlatformUserRowMenu } from "@/components/admin/platform-user-row-menu";
import type { PlatformUserRow } from "@/components/admin/platform-users-module";

function parsePreferences(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function accountStatus(user: { isActive: boolean; archivedAt: Date | null }) {
  if (user.archivedAt) return { label: "Archived", variant: "neutral" as const };
  if (!user.isActive) return { label: "Deactivated", variant: "warning" as const };
  return { label: "Active", variant: "success" as const };
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-50 py-2.5 last:border-0">
      <span className="shrink-0 text-[12px] text-gray-500">{label}</span>
      <span className="text-right text-[12.5px] font-medium text-gray-900">
        {children || <span className="text-gray-400">—</span>}
      </span>
    </div>
  );
}

export default async function PlatformUserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
      preferences: true,
      company: { select: { id: true, name: true, slug: true, plan: true } },
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          middleName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          jobTitle: true,
          employmentType: true,
          hireDate: true,
          status: true,
          department: { select: { name: true } },
          manager: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!user) notFound();

  // Tenant super admins stay hidden, but the signed-in Super Admin can open
  // their own platform account from /admin/users.
  const isSelf = user.id === session.id;
  if (user.role === "SUPER_ADMIN" && !isSelf) notFound();

  const preferences = parsePreferences(user.preferences);
  const name = user.employee
    ? fullName(user.employee.firstName, user.employee.lastName)
    : isSelf
      ? fullName(
          asString(preferences.firstName) ?? session.firstName ?? "Super",
          asString(preferences.lastName) ?? session.lastName ?? "Admin"
        )
      : user.email.split("@")[0];
  const avatar =
    user.employee?.avatar ?? asString(preferences.avatar) ?? null;
  const status = accountStatus(user);
  const employmentType = user.employee
    ? resolveEmploymentType(user.employee)
    : null;

  const row: PlatformUserRow = {
    id: user.id,
    name,
    email: user.email,
    role: user.role,
    companyId: user.company?.id ?? null,
    companyName: user.company?.name ?? null,
    employeeId: user.employee?.id ?? null,
    firstName: user.employee?.firstName ?? null,
    lastName: user.employee?.lastName ?? null,
    avatar,
    createdAt: user.createdAt.toISOString(),
    isActive: user.isActive,
    archivedAt: user.archivedAt ? user.archivedAt.toISOString() : null,
  };

  return (
    <div className="w-full">
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12.5px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Platform users
      </Link>

      <PageHeader
        title={name}
        description={user.email}
        action={
          isSelf ? (
            <Link
              href="/settings/profile"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#7B61FF] px-3.5 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-[#6a52e8]"
            >
              <Pencil className="h-4 w-4" />
              Edit my profile
            </Link>
          ) : (
            <PlatformUserRowMenu user={row} redirectOnDelete="/admin/users" />
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit p-6">
          <div className="flex flex-col items-center text-center">
            <Avatar
              firstName={name.split(" ")[0] ?? ""}
              lastName={name.split(" ").slice(1).join(" ")}
              src={avatar}
              size="2xl"
            />
            <h2 className="mt-3 text-base font-semibold text-gray-900">{name}</h2>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12.5px] text-gray-500">
              <Mail className="h-3.5 w-3.5" />
              {user.email}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge
                variant={
                  user.role === "COMPANY_ADMIN"
                    ? "info"
                    : user.role === "SUPER_ADMIN"
                      ? "warning"
                      : "neutral"
                }
              >
                {roleLabel(user.role)}
              </Badge>
            </div>
          </div>

          <div className="my-5 border-t border-gray-100" />

          <div>
            <DetailRow label="Company">
              {user.company ? (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  {user.company.name}
                </span>
              ) : (
                <span className="text-gray-400">Platform</span>
              )}
            </DetailRow>
            <DetailRow label="Joined">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                {formatDate(user.createdAt)}
              </span>
            </DetailRow>
            <DetailRow label="Last updated">{formatDate(user.updatedAt)}</DetailRow>
            <DetailRow label="Account type">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-gray-400" />
                {user.role === "SUPER_ADMIN" ? "Platform Super Admin" : "Company user"}
              </span>
            </DetailRow>
          </div>

          {user.company && (
            <>
              <div className="my-4 border-t border-gray-100" />
              <div className="space-y-1.5">
                <Link
                  href={`/admin/companies/${user.company.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-violet-700 hover:bg-violet-50"
                >
                  View company
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href={`/admin/companies/${user.company.id}/users`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-violet-700 hover:bg-violet-50"
                >
                  Manage company users
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          )}
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-[13px] font-semibold text-gray-900">Account details</h3>
              <p className="mt-0.5 text-[11.5px] text-gray-500">
                Login and platform access for this account.
              </p>
            </div>
            <div className="px-5 py-2">
              <DetailRow label="Login email">{user.email}</DetailRow>
              <DetailRow label="Role">{roleLabel(user.role)}</DetailRow>
              <DetailRow label="Account status">
                <Badge variant={status.variant}>{status.label}</Badge>
              </DetailRow>
              <DetailRow label="Company">
                {user.company ? (
                  <Link
                    href={`/admin/companies/${user.company.id}`}
                    className="text-violet-700 hover:underline"
                  >
                    {user.company.name}
                  </Link>
                ) : (
                  <span className="text-gray-400">Platform</span>
                )}
              </DetailRow>
              <DetailRow label="Created">{formatDate(user.createdAt)}</DetailRow>
              <DetailRow label="Last updated">{formatDate(user.updatedAt)}</DetailRow>
              {user.archivedAt && (
                <DetailRow label="Archived">{formatDate(user.archivedAt)}</DetailRow>
              )}
            </div>
          </Card>

          <Card>
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-[13px] font-semibold text-gray-900">Employee profile</h3>
              <p className="mt-0.5 text-[11.5px] text-gray-500">
                HR record linked to this login.
              </p>
            </div>

            {user.employee ? (
              <div className="px-5 py-2">
                <DetailRow label="Full name">
                  {[user.employee.firstName, user.employee.middleName, user.employee.lastName]
                    .filter(Boolean)
                    .join(" ")}
                </DetailRow>
                <DetailRow label="Employee code">{user.employee.employeeCode}</DetailRow>
                <DetailRow label="Job title">{user.employee.jobTitle}</DetailRow>
                <DetailRow label="Department">{user.employee.department.name}</DetailRow>
                <DetailRow label="Employment type">
                  {employmentType ? employmentLabel(employmentType) : "—"}
                </DetailRow>
                <DetailRow label="Hire date">{formatDate(user.employee.hireDate)}</DetailRow>
                <DetailRow label="Work email">{user.employee.email}</DetailRow>
                <DetailRow label="Phone">{user.employee.phone || "—"}</DetailRow>
                <DetailRow label="Reports to">
                  {user.employee.manager
                    ? fullName(
                        user.employee.manager.firstName,
                        user.employee.manager.lastName
                      )
                    : "—"}
                </DetailRow>
                <DetailRow label="Employee status">
                  {statusBadge(user.employee.status)}
                </DetailRow>
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <UserRound className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-[13px] font-medium text-gray-700">
                  {user.role === "SUPER_ADMIN"
                    ? "Platform account"
                    : "No employee record linked"}
                </p>
                <p className="mx-auto mt-1 max-w-sm text-[12px] text-gray-500">
                  {user.role === "SUPER_ADMIN"
                    ? "Super Admin accounts are not tied to a company or HR profile. Use Edit my profile to update your name, photo, contact details, and password."
                    : "This login can still use the platform, but it has no HR profile. Add the person to a company to create one."}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
