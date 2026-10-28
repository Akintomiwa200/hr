import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Pencil, ShieldCheck, UserRound, Users } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fullName } from "@/lib/utils";
import { Avatar, Badge, Card, PageHeader, StatCard } from "@/components/ui";
import {
  PlatformUsersModule,
  type PlatformUserRow,
} from "@/components/admin/platform-users-module";

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

export default async function PlatformUsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");

  // Platform super admins and accounts detached from a deleted company are
  // intentionally excluded from the tenant user list.
  const users = await prisma.user.findMany({
    where: { role: { not: "SUPER_ADMIN" }, companyId: { not: null } },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      isActive: true,
      archivedAt: true,
      preferences: true,
      company: { select: { id: true, name: true } },
      employee: {
        select: { id: true, firstName: true, lastName: true, avatar: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // The signed-in Super Admin is not part of the tenant table, but they still
  // need a way to view and edit their own platform account.
  const me = await prisma.user.findUnique({
    where: { id: session.id },
    select: { createdAt: true, preferences: true },
  });
  const myPreferences = parsePreferences(me?.preferences ?? null);
  const myFirstName = asString(myPreferences.firstName) ?? session.firstName ?? "Super";
  const myLastName = asString(myPreferences.lastName) ?? session.lastName ?? "Admin";
  const myAvatar = asString(myPreferences.avatar) ?? session.avatar ?? null;
  const myName = fullName(myFirstName, myLastName);

  const rows: PlatformUserRow[] = users.map((user) => {
    const preferences = parsePreferences(user.preferences);
    return {
      id: user.id,
      name: user.employee
        ? fullName(user.employee.firstName, user.employee.lastName)
        : user.email.split("@")[0],
      email: user.email,
      role: user.role,
      companyId: user.company?.id ?? null,
      companyName: user.company?.name ?? null,
      employeeId: user.employee?.id ?? null,
      firstName: user.employee?.firstName ?? null,
      lastName: user.employee?.lastName ?? null,
      avatar:
        user.employee?.avatar ??
        asString(preferences.avatar) ??
        null,
      createdAt: user.createdAt.toISOString(),
      isActive: user.isActive,
      archivedAt: user.archivedAt ? user.archivedAt.toISOString() : null,
    };
  });

  const companyCount = new Set(
    users.map((user) => user.company?.name).filter(Boolean)
  ).size;
  const inactiveCount = rows.filter(
    (row) => !row.isActive || row.archivedAt
  ).length;

  return (
    <div className="w-full">
      <PageHeader
        title="Platform users"
        description="Every account attached to a company on Smart HR, across all tenants."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total accounts"
          value={rows.length}
          icon={Users}
          trend={`${inactiveCount} deactivated or archived`}
        />
        <StatCard
          label="Company admins"
          value={rows.filter((row) => row.role === "COMPANY_ADMIN").length}
          icon={UserRound}
        />
        <StatCard label="Companies" value={companyCount} icon={Building2} />
      </div>

      <Card className="mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <Avatar
            firstName={myFirstName}
            lastName={myLastName}
            src={myAvatar}
            size="lg"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-semibold text-gray-900">{myName}</p>
              <Badge variant="info" className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Super Admin
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-[12.5px] text-gray-500">{session.email}</p>
            <p className="mt-0.5 text-[11.5px] text-gray-400">
              Your platform account · not part of any company
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/admin/users/${session.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-[12.5px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <UserRound className="h-4 w-4" />
            View my profile
          </Link>
          <Link
            href="/settings/profile"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#7B61FF] px-3.5 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-[#6a52e8]"
          >
            <Pencil className="h-4 w-4" />
            Edit my profile
          </Link>
        </div>
      </Card>

      <PlatformUsersModule users={rows} />
    </div>
  );
}
