import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { SettingsModule } from "@/components/settings/settings-module";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { APP_CURRENCIES } from "@/lib/currency";
import { getAppCurrencyCode } from "@/lib/currency-server";
import { isSuperAdmin, canManageEmployees, normalizeRole } from "@/lib/roles";
import { RetentionSettingsCard } from "@/components/offboarding/retention-settings-card";
import { CompanyProfileCard } from "@/components/settings/company/company-profile-card";

const COMPANY_EDIT_ROLES: string[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"];

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = normalizeRole(session.role);
  const canEditCompany =
    session.companyId != null && COMPANY_EDIT_ROLES.includes(role);

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { preferences: true },
  });

  const employee = session.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.employeeId },
        include: { department: true },
      })
    : null;

  let preferences: Record<string, boolean> = {};
  if (user?.preferences) {
    try {
      preferences = JSON.parse(user.preferences);
    } catch {
      preferences = {};
    }
  }

  const currencyCode = isSuperAdmin(session.role)
    ? await getAppCurrencyCode()
    : null;

  const company = canEditCompany
    ? await prisma.company.findUnique({
        where: { id: session.companyId! },
        select: { name: true, logo: true, email: true, phone: true, address: true },
      })
    : null;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
        action={<ModulePageActions helpSlug="settings" helpLabel="Settings guide" />}
      />
      {company && (
        <div className="mb-6">
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
      )}
      <SettingsModule
        email={session.email}
        role={session.role}
        employee={employee}
        preferences={preferences}
        platformCurrency={
          currencyCode
            ? { currencyCode, options: APP_CURRENCIES }
            : null
        }
      />
      {canManageEmployees(session.role) && (
        <div className="mt-6">
          <RetentionSettingsCard />
        </div>
      )}
    </div>
  );
}

