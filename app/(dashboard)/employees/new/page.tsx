import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { NewEmployeeForm } from "./new-employee-form";

export default async function NewEmployeePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/employees");

  const [departments, managers] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { user: { role: { in: ["ADMIN", "MANAGER"] } } },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Add Employee"
        description="Create a new employee account and profile"
      />
      <Card className="p-6">
        <NewEmployeeForm departments={departments} managers={managers} />
      </Card>
    </div>
  );
}
