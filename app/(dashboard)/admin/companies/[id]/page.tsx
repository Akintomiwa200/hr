import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  CreditCard,
  MapPin,
  ScrollText,
  UserRound,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { planLabel } from "@/lib/subscription-plans";
import { StatCard } from "@/components/ui";

function formatDate(value: Date | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CompanyOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [company, employeeCount, activeEmployeeCount] = await Promise.all([
    prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            departments: true,
            branches: true,
            jobs: true,
            auditLogs: true,
          },
        },
      },
    }),
    prisma.employee.count({ where: { user: { companyId: id } } }),
    prisma.employee.count({
      where: { user: { companyId: id }, status: "ACTIVE" },
    }),
  ]);

  if (!company) notFound();

  const quickLinks = [
    {
      label: "Platform users",
      description: `${company._count.users} account${company._count.users === 1 ? "" : "s"}`,
      href: `/admin/companies/${id}/users`,
      icon: Users,
    },
    {
      label: "Employees",
      description: `${employeeCount} record${employeeCount === 1 ? "" : "s"}`,
      href: `/admin/companies/${id}/employees`,
      icon: UserRound,
    },
    {
      label: "Billing",
      description: `${planLabel(company.plan)} · ${company.subscriptionStatus}`,
      href: `/admin/companies/${id}/billing`,
      icon: CreditCard,
    },
    {
      label: "Activity",
      description: `${company._count.auditLogs} event${company._count.auditLogs === 1 ? "" : "s"}`,
      href: `/admin/companies/${id}/activity`,
      icon: ScrollText,
    },
  ];

  const details = [
    { label: "Company email", value: company.email ?? "—" },
    { label: "Phone", value: company.phone ?? "—" },
    { label: "Address", value: company.address ?? "—" },
    { label: "Billing email", value: company.billingEmail ?? "—" },
    { label: "Subscription provider", value: company.subscriptionProvider },
    { label: "Trial ends", value: formatDate(company.trialEndsAt) },
    { label: "Current period ends", value: formatDate(company.currentPeriodEnd) },
    { label: "Created", value: formatDate(company.createdAt) },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Platform users" value={company._count.users} icon={Users} />
        <StatCard
          label="Employees"
          value={`${activeEmployeeCount}/${employeeCount}`}
          icon={UserRound}
          trend="active / total"
        />
        <StatCard label="Departments" value={company._count.departments} icon={Building2} />
        <StatCard label="Branches" value={company._count.branches} icon={MapPin} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] xl:col-span-3">
          <h2 className="text-[13px] font-semibold text-gray-900">Company profile</h2>
          <p className="mt-1 text-[12px] text-gray-500">
            Tenant details and subscription metadata.
          </p>
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {details.map((detail) => (
              <div key={detail.label} className="min-w-0">
                <dt className="text-[11px] uppercase tracking-wide text-gray-400">
                  {detail.label}
                </dt>
                <dd className="mt-0.5 truncate text-[12.5px] font-medium text-gray-800">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] xl:col-span-2">
          <h2 className="text-[13px] font-semibold text-gray-900">Explore tenant</h2>
          <p className="mt-1 text-[12px] text-gray-500">
            Jump into this company&apos;s platform records.
          </p>
          <div className="mt-3 divide-y divide-gray-50">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className="group flex items-center gap-3 py-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-[#7B61FF]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium text-gray-900 group-hover:text-[#7B61FF]">
                      {link.label}
                    </span>
                    <span className="block text-[11px] text-gray-500">{link.description}</span>
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-[#7B61FF]" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
