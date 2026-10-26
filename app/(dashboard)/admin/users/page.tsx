import { redirect } from "next/navigation";
import { Building2, ShieldCheck, UserRound, Users } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fullName } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/ui";
import {
  PlatformUsersModule,
  type PlatformUserRow,
} from "@/components/admin/platform-users-module";

export default async function PlatformUsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      company: { select: { name: true } },
      employee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: PlatformUserRow[] = users.map((user) => ({
    id: user.id,
    name: user.employee
      ? fullName(user.employee.firstName, user.employee.lastName)
      : user.email.split("@")[0],
    email: user.email,
    role: user.role,
    companyName: user.company?.name ?? null,
    createdAt: user.createdAt.toISOString(),
  }));

  const companyCount = new Set(
    users.map((user) => user.company?.name).filter(Boolean)
  ).size;

  return (
    <div className="w-full">
      <PageHeader
        title="Platform users"
        description="Every account on Smart HR, across all companies and the platform team."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total accounts" value={rows.length} icon={Users} />
        <StatCard
          label="Super admins"
          value={rows.filter((row) => row.role === "SUPER_ADMIN").length}
          icon={ShieldCheck}
        />
        <StatCard
          label="Company admins"
          value={rows.filter((row) => row.role === "COMPANY_ADMIN").length}
          icon={UserRound}
        />
        <StatCard label="Companies" value={companyCount} icon={Building2} />
      </div>

      <PlatformUsersModule users={rows} />
    </div>
  );
}
