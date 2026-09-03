import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import { CompanyProfileCard } from "@/components/settings/company/company-profile-card";

const COMPANY_EDIT_ROLES: string[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"];

export default async function CompanySettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = normalizeRole(session.role);
  const canEditCompany = session.companyId != null && COMPANY_EDIT_ROLES.includes(role);
  if (!canEditCompany) redirect("/settings");

  const company = await prisma.company.findUnique({
    where: { id: session.companyId! },
    select: { name: true, logo: true, email: true, phone: true, address: true },
  });
  if (!company) notFound();

  return (
    <div>
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-brand-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Company profile</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Your company name, logo and contact details — shown across the app in real time.
      </p>
      <CompanyProfileCard
        initialCompany={{
          name: company.name,
          logo: company.logo,
          email: company.email,
          phone: company.phone,
          address: company.address,
        }}
      />
    </div>
  );
}