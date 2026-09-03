import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SettingsOverviewModule, type SettingsCardItem } from "@/components/settings/settings-overview-module";
import { ModulePageActions } from "@/components/help/module-page-actions";
import {
  isSuperAdmin,
  canManageEmployees,
  normalizeRole,
  hasRole,
  canManageDevices,
  canManageOrgContent,
} from "@/lib/roles";
import {
  Building2,
  ExternalLink,
  Link2,
  MessageSquare,
  Shield,
  UserRound,
  Wallet,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { INTEGRATION_ADMIN_ROLES, SUBSCRIPTION_ADMIN_ROLES } from "@/lib/roles";

const COMPANY_EDIT_ROLES: string[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"];

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = normalizeRole(session.role);
  const canEditCompany = session.companyId != null && COMPANY_EDIT_ROLES.includes(role);
  const canAccessHelp = canManageOrgContent(role as Role);

  const cards: SettingsCardItem[] = [];

  cards.push({
    id: "profile",
    title: "Profile & notifications",
    description: "Manage your account details, phone, address, and the updates you receive.",
    href: "/settings/profile",
    icon: UserRound,
    accent: "text-violet-600 bg-violet-50",
  });

  if (canEditCompany) {
    cards.push({
      id: "company",
      title: "Company profile",
      description: "Your company name, logo, and contact details — shown across the app.",
      href: "/settings/company",
      icon: Building2,
      accent: "text-sky-600 bg-sky-50",
    });
  }

  if (canManageEmployees(session.role)) {
    cards.push({
      id: "retention",
      title: "Retention settings",
      description: "Configure how offboarding retains employee records and data.",
      href: "/settings/retention",
      icon: Shield,
      accent: "text-emerald-600 bg-emerald-50",
    });
  }

  cards.push({
    id: "security",
    title: "Account security",
    description: "Access and permissions, plus a link to your employee profile.",
    href: "/settings/security",
    icon: Shield,
    accent: "text-violet-600 bg-violet-50",
  });

  if (isSuperAdmin(session.role)) {
    cards.push({
      id: "currency",
      title: "Platform currency",
      description: "Set the default currency used for payroll across your platform.",
      href: "/settings/currency",
      icon: Wallet,
      accent: "text-amber-600 bg-amber-50",
    });
  }

  if (hasRole(session.role, [...SUBSCRIPTION_ADMIN_ROLES, "HR"])) {
    cards.push({
      id: "subscription",
      title: "Subscription & billing",
      description: "View your plan, employee usage, trial status, and upgrade options.",
      href: "/settings/subscription",
      icon: Wallet,
      accent: "text-emerald-600 bg-emerald-50",
    });
  }

  if (hasRole(session.role, INTEGRATION_ADMIN_ROLES)) {
    cards.push({
      id: "integrations",
      title: "Google & Zoho integrations",
      description: "Connect Google Workspace and Zoho apps for real-time sync.",
      href: "/settings/integrations",
      icon: Link2,
      accent: "text-violet-600 bg-violet-50",
    });
  }

  if (isSuperAdmin(session.role) || canManageEmployees(session.role)) {
    cards.push({
      id: "roles",
      title: "Roles & permissions",
      description: "View built-in roles and create custom roles for your team.",
      href: "/settings/roles",
      icon: Shield,
      accent: "text-sky-600 bg-sky-50",
    });
  }

  if (canManageDevices(session.role)) {
    cards.push({
      id: "api",
      title: "API & device integration",
      description: "REST reference, ZKTeco ADMS endpoints, SSE realtime events, and branch console.",
      href: "/docs",
      icon: ExternalLink,
      accent: "text-brand-600 bg-brand-50",
    });
  }

  if (canAccessHelp) {
    cards.push({
      id: "help",
      title: "Help Center",
      description: "Guides and support for every Smart HR module, in one place.",
      href: "/help",
      icon: MessageSquare,
      accent: "text-violet-600 bg-violet-50",
    });
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account, company, and preferences"
        action={<ModulePageActions helpSlug="settings" helpLabel="Settings guide" />}
      />
      <SettingsOverviewModule cards={cards} />
    </div>
  );
}