import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Users, CheckCircle2, XCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CompaniesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");

  const companies = await prisma.company.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="w-full max-w-5xl">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Companies</h1>
        <p className="text-sm text-gray-500 mt-1">
          Platform tenants registered on Smart HR.
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-[13px] font-semibold text-gray-900">All companies</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {companies.map((company) => (
            <div key={company.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[#7B61FF]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-gray-900 truncate">{company.name}</p>
                  <p className="text-[12px] text-gray-500">
                    {company.slug} · {company.plan} plan
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
                  <Users className="w-3.5 h-3.5" />
                  {company._count.users}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                    company.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {company.isActive ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {company.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
          {companies.length === 0 && (
            <p className="px-5 py-8 text-sm text-gray-500 text-center">No companies yet.</p>
          )}
        </div>
      </div>

      <p className="text-[12px] text-gray-400 mt-4">
        Need to onboard a tenant?{" "}
        <Link href="/settings" className="text-[#7B61FF] hover:underline">
          Contact platform support
        </Link>
      </p>
    </div>
  );
}
