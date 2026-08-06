import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession, canManageEmployees } from "@/lib/auth";
import { PEOPLE_ADMIN_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { NewEmployeeForm } from "./new-employee-form";

export default async function NewEmployeePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageEmployees(session.role)) redirect("/employees");

  const [departments, managers] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { user: { role: { in: PEOPLE_ADMIN_ROLES } } },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <div>
      <div className="py-[1em] mb-6">
        <Link
          href="/employees"
          className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-[#7B61FF] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to employees
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Onboarding</h1>
            <p className="text-[14px] text-gray-500 mt-1">
              Create an employee account with default password and send a welcome email instantly
            </p>
          </div>
          <ModulePageActions helpSlug="employees" helpLabel="Employees guide" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] w-full">
        <NewEmployeeForm departments={departments} managers={managers} />
      </div>
    </div>
  );
}
