import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import type { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import {
  LEAVE_APPROVER_ROLES,
  LEAVE_ALLOCATION_ADMIN_ROLES,
  LOAN_APPROVER_ROLES,
  LOAN_VIEW_ROLES,
  ORG_ROLES,
  PAYROLL_ADMIN_ROLES,
  PAYROLL_OPERATIONS_ROLES,
  PAYROLL_VIEW_ROLES,
  PEOPLE_ADMIN_ROLES,
  PEOPLE_VIEW_ROLES,
  PERFORMANCE_ADMIN_ROLES,
  PERFORMANCE_VIEW_ROLES,
  RECRUITMENT_ROLES,
  REPORTS_ADMIN_ROLES,
  REPORTS_TEAM_ROLES,
  REPORTS_VIEW_ROLES,
  canManageDevices,
  canManageOrgContent,
  canManageLeaveAllocations,
  canManageEmployees,
  roleLabel,
} from "@/lib/roles";
import { PageHeader } from "@/components/ui";

type RolePageProps = { params: Promise<{ role: string }> };

export default async function BuiltInRolePage({ params }: RolePageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageEmployees(session.role) && session.role !== "SUPER_ADMIN") {
    redirect("/settings");
  }

  const { role: roleParam } = await params;
  if (!ORG_ROLES.includes(roleParam as Role)) notFound();
  const role = roleParam as Role;
  const privileges: { title: string; description: string; allowed: boolean }[] = [
    { title: "People directory", description: "View employee profiles and team information.", allowed: PEOPLE_VIEW_ROLES.includes(role) },
    { title: "Manage people", description: "Add, edit, and manage employee records.", allowed: PEOPLE_ADMIN_ROLES.includes(role) },
    { title: "Leave requests", description: "View and submit leave requests.", allowed: ORG_ROLES.includes(role) },
    { title: "Approve leave", description: "Review and approve requests within the permitted scope.", allowed: LEAVE_APPROVER_ROLES.includes(role) },
    { title: "Manage leave balances", description: "Configure leave allocations and yearly balances.", allowed: canManageLeaveAllocations(role) },
    { title: "Payroll", description: "View payroll information available to this role.", allowed: PAYROLL_VIEW_ROLES.includes(role) },
    { title: "Manage payroll", description: "Run payroll and manage payroll records.", allowed: PAYROLL_ADMIN_ROLES.includes(role) },
    { title: "Payroll operations", description: "Run payroll, edit payslips, and import adjustments.", allowed: PAYROLL_OPERATIONS_ROLES.includes(role) },
    { title: "Loans", description: "View and request loans.", allowed: LOAN_VIEW_ROLES.includes(role) },
    { title: "Approve loans", description: "Review loan requests and view company loan records.", allowed: LOAN_APPROVER_ROLES.includes(role) },
    { title: "Performance", description: "Open reviews, cycles, and appraisals.", allowed: PERFORMANCE_VIEW_ROLES.includes(role) },
    { title: "Manage performance", description: "Manage performance cycles and reviews.", allowed: PERFORMANCE_ADMIN_ROLES.includes(role) },
    { title: "Recruitment", description: "Manage jobs and candidates.", allowed: RECRUITMENT_ROLES.includes(role) },
    { title: "Reports", description: "View reports available to this role.", allowed: REPORTS_VIEW_ROLES.includes(role) || REPORTS_TEAM_ROLES.includes(role) },
    { title: "Company-wide reports", description: "View organization-wide HR analytics.", allowed: REPORTS_ADMIN_ROLES.includes(role) },
    { title: "Devices", description: "Manage attendance devices and integrations.", allowed: canManageDevices(role) },
    { title: "Announcements and help content", description: "Manage shared company content.", allowed: canManageOrgContent(role) },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Link href="/settings/roles" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-brand-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to roles
      </Link>
      <PageHeader title={`${roleLabel(role)} privileges`} description="Access granted by this built-in system role." />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {privileges.map((privilege) => (
          <div key={privilege.title} className={`rounded-xl border p-4 ${privilege.allowed ? "border-emerald-100 bg-white" : "border-gray-100 bg-gray-50/70"}`}>
            <div className="flex items-center gap-2">
              {privilege.allowed ? <Check className="w-4 h-4 text-emerald-600" /> : <ShieldCheck className="w-4 h-4 text-gray-300" />}
              <h2 className={`text-sm font-semibold ${privilege.allowed ? "text-gray-900" : "text-gray-400"}`}>{privilege.title}</h2>
            </div>
            <p className={`mt-2 text-xs ${privilege.allowed ? "text-gray-500" : "text-gray-400"}`}>{privilege.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
