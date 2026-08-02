import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrgChartData, getDepartmentOrgTree } from "@/lib/org-chart-data";
import { DepartmentDetailModule } from "@/components/departments/department-detail-module";

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/dashboard");

  const { id } = await params;

  const [department, orgData] = await Promise.all([
    prisma.department.findUnique({
      where: { id },
      include: {
        employees: {
          include: {
            user: { select: { role: true } },
            manager: { select: { firstName: true, lastName: true } },
          },
          orderBy: { firstName: "asc" },
        },
        jobs: { orderBy: { postedAt: "desc" } },
      },
    }),
    getOrgChartData(),
  ]);

  if (!department) notFound();

  const departmentTree = getDepartmentOrgTree(orgData, id);

  return (
    <DepartmentDetailModule
      departmentId={department.id}
      name={department.name}
      description={department.description}
      orgTree={departmentTree}
      members={department.employees.map((emp) => ({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        jobTitle: emp.jobTitle,
        role: emp.user.role,
        avatar: emp.avatar,
        managerFirstName: emp.manager?.firstName ?? null,
        managerLastName: emp.manager?.lastName ?? null,
      }))}
      jobs={department.jobs.map((job) => ({
        id: job.id,
        title: job.title,
        location: job.location,
        status: job.status,
      }))}
    />
  );
}
