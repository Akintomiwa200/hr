import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { HelpLink } from "@/components/help/help-link";
import { UsersRound, Network } from "lucide-react";
export default async function TeamsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const departments = await prisma.department.findMany({
    include: {
      employees: {
        select: { id: true, firstName: true, lastName: true, jobTitle: true },
        take: 5,
      },
      _count: { select: { employees: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Teams"
        description="Department teams and their members"
        action={
          <div className="flex items-center gap-4">
            <HelpLink slug="teams" label="Teams guide" />
            {session.role !== "EMPLOYEE" && (
              <Link
                href="/departments"
                className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700"
              >
                <Network className="w-4 h-4" />
                Org chart
              </Link>
            )}
          </div>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map((dept) => (
          <Card key={dept.id}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <UsersRound className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/departments/${dept.id}`}
                    className="text-sm font-semibold text-gray-900 hover:text-violet-600"
                  >
                    {dept.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {dept._count.employees} member{dept._count.employees === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {dept.employees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 font-medium">
                      {emp.firstName} {emp.lastName}
                    </span>
                    <span className="text-gray-400">{emp.jobTitle}</span>
                  </div>
                ))}
                {dept._count.employees > dept.employees.length && (
                  <p className="text-[11px] text-gray-400 pt-1">
                    +{dept._count.employees - dept.employees.length} more
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
