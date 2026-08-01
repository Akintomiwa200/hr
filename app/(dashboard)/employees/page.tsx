import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { getSession, canManageEmployees } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import { EmptyState } from "@/components/ui";
import { Users } from "lucide-react";

export default async function EmployeesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const employees = await prisma.employee.findMany({
    include: { department: true, manager: true, user: { select: { role: true } } },
    orderBy: { firstName: "asc" },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-[1em] mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Employees</h1>
          <p className="text-[14px] text-gray-500 mt-1">
            {canManageEmployees(session.role)
              ? "Manage your organization's workforce"
              : "View team directory"}
          </p>
        </div>
        {session.role === "ADMIN" && (
          <Link
            href="/employees/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium bg-[#7B61FF] text-white rounded-xl hover:bg-violet-600 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </Link>
        )}
      </div>

      {employees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <EmptyState
            icon={Users}
            title="No employees yet"
            description="Add your first employee to get started."
          />
        </div>
      ) : (
        <EmployeeTable employees={employees} />
      )}
    </div>
  );
}
