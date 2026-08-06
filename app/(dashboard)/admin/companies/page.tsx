import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompaniesAdminModule } from "@/components/admin/companies-admin-module";

export default async function CompaniesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");

  const companies = await prisma.company.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Companies</h1>
        <p className="text-sm text-gray-500 mt-1">
          Platform tenants, subscription plans, and real-time billing status.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[12px] text-gray-500">Total</p>
          <p className="text-2xl font-bold text-[#7B61FF] mt-1">{companies.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[12px] text-gray-500">Active</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {companies.filter((c) => c.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[12px] text-gray-500">Total users</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {companies.reduce((sum, c) => sum + c._count.users, 0)}
          </p>
        </div>
      </div>

      <CompaniesAdminModule companies={companies} />
    </div>
  );
}
