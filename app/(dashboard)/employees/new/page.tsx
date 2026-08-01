import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
      <div className="py-[1em] mb-6">
        <Link
          href="/employees"
          className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-[#7B61FF] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to employees
        </Link>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Add Employee</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Create a new employee account and profile
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <NewEmployeeForm departments={departments} managers={managers} />
      </div>
    </div>
  );
}
