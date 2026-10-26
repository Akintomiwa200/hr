import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planLabel } from "@/lib/subscription-plans";
import { Badge, PageHeader } from "@/components/ui";
import { CompanyTabNav } from "@/components/admin/company-tab-nav";

export default async function CompanyDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");

  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      subscriptionStatus: true,
      isActive: true,
      isLocked: true,
    },
  });

  if (!company) notFound();

  return (
    <div className="w-full">
      <Link
        href="/admin/companies"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-[#7B61FF]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to companies
      </Link>

      <PageHeader
        title={company.name}
        description={`${company.slug} · ${planLabel(company.plan)} · ${company.subscriptionStatus}`}
        action={
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant={company.isActive ? "success" : "neutral"}>
              {company.isActive ? "Active" : "Inactive"}
            </Badge>
            {company.isLocked && <Badge variant="warning">Locked</Badge>}
          </div>
        }
      />

      <CompanyTabNav companyId={company.id} />
      <div className="mt-5">{children}</div>
    </div>
  );
}
