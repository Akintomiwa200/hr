import type { Role } from "@prisma/client";
import { normalizeRole, isTeamLeadRole, canManageEmployees, canManageOrgContent } from "@/lib/roles";

export type WorkspaceMode = "self" | "team" | "org" | "admin" | "directory";

export type ModuleWorkspace = {
  title: string;
  description: string;
  mode: WorkspaceMode;
  /** Employee can submit their own leave / check-in etc. */
  canActForSelf: boolean;
  /** Approvals / team actions */
  canActForTeam: boolean;
};

function base(role: Role) {
  return normalizeRole(role);
}

export function getLeaveWorkspace(role: Role): ModuleWorkspace {
  const r = base(role);
  if (r === "EMPLOYEE") {
    return {
      title: "My leave",
      description: "Request time off and track your approval status",
      mode: "self",
      canActForSelf: true,
      canActForTeam: false,
    };
  }
  if (isTeamLeadRole(r)) {
    return {
      title: "Team leave",
      description: "Approve requests for your reports and manage your own time off",
      mode: "team",
      canActForSelf: true,
      canActForTeam: true,
    };
  }
  return {
    title: "Leave management",
    description: "Organization leave queue — approve, track balances, and support employees",
    mode: "org",
    canActForSelf: true,
    canActForTeam: true,
  };
}

export function getAttendanceWorkspace(role: Role): ModuleWorkspace {
  const r = base(role);
  if (r === "EMPLOYEE") {
    return {
      title: "My attendance",
      description: "Check in, check out, and review your daily history",
      mode: "self",
      canActForSelf: true,
      canActForTeam: false,
    };
  }
  if (isTeamLeadRole(r)) {
    return {
      title: "Team attendance",
      description: "See who on your team is present, late, or remote today",
      mode: "team",
      canActForSelf: true,
      canActForTeam: true,
    };
  }
  return {
    title: "Attendance control",
    description: "Organization-wide presence, devices, and attendance exceptions",
    mode: "org",
    canActForSelf: true,
    canActForTeam: true,
  };
}

export function getPeopleWorkspace(role: Role): ModuleWorkspace {
  const r = base(role);
  if (canManageEmployees(r)) {
    return {
      title: "People admin",
      description: "Onboard, edit profiles, assign managers, and manage the full company directory",
      mode: "admin",
      canActForSelf: false,
      canActForTeam: true,
    };
  }
  if (isTeamLeadRole(r)) {
    return {
      title: "My team",
      description: "People who report to you — open profiles, attendance, and leave",
      mode: "team",
      canActForSelf: false,
      canActForTeam: true,
    };
  }
  return {
    title: "Company directory",
    description: "Browse colleagues across the organization (view only)",
    mode: "directory",
    canActForSelf: false,
    canActForTeam: false,
  };
}

export function getPerformanceWorkspace(role: Role): ModuleWorkspace {
  const r = base(role);
  if (r === "EMPLOYEE") {
    return {
      title: "My performance",
      description: "Complete self-appraisals, track KPIs, and view review results",
      mode: "self",
      canActForSelf: true,
      canActForTeam: false,
    };
  }
  if (r === "SUPERVISOR") {
    return {
      title: "Team reviews",
      description: "Score appraisals for your reports and follow review progress",
      mode: "team",
      canActForSelf: true,
      canActForTeam: true,
    };
  }
  if (r === "MANAGER") {
    return {
      title: "Performance leadership",
      description: "Run cycles, define KPIs for your scope, and complete manager reviews",
      mode: "team",
      canActForSelf: true,
      canActForTeam: true,
    };
  }
  return {
    title: "Performance operations",
    description: "Configure KPIs, activate cycles, score appraisals, and publish results",
    mode: "org",
    canActForSelf: true,
    canActForTeam: true,
  };
}

export function getReportsWorkspace(role: Role): ModuleWorkspace {
  const r = base(role);
  if (r === "EMPLOYEE") {
    return {
      title: "My reports",
      description: "Personal leave and time-off insights available to you",
      mode: "self",
      canActForSelf: true,
      canActForTeam: false,
    };
  }
  if (isTeamLeadRole(r)) {
    return {
      title: "Team reports",
      description: "Headcount, leave, and people insights for your direct reports",
      mode: "team",
      canActForSelf: false,
      canActForTeam: true,
    };
  }
  return {
    title: "Organization reports",
    description: "Company-wide analytics across people, time, and talent",
    mode: "org",
    canActForSelf: false,
    canActForTeam: true,
  };
}

export function getPayrollWorkspace(role: Role): ModuleWorkspace {
  const r = base(role);
  if (r === "EMPLOYEE") {
    return {
      title: "My payslips",
      description: "View your salary history and download payslips",
      mode: "self",
      canActForSelf: true,
      canActForTeam: false,
    };
  }
  if (isTeamLeadRole(r)) {
    return {
      title: "Team payroll preview",
      description: "View-only payroll for yourself and your direct reports",
      mode: "team",
      canActForSelf: true,
      canActForTeam: true,
    };
  }
  if (r === "ACCOUNT_OFFICER") {
    return {
      title: "Payroll register",
      description: "Group payroll runs, export registers, import updates, and edit individual payslips",
      mode: "org",
      canActForSelf: false,
      canActForTeam: false,
    };
  }
  return {
    title: "Payroll operations",
    description: "Run payroll, configure deductions, and manage payslips",
    mode: "org",
    canActForSelf: false,
    canActForTeam: true,
  };
}

export function getTeamsWorkspace(role: Role): ModuleWorkspace {
  const r = base(role);
  if (r === "EMPLOYEE") {
    return {
      title: "Teams directory",
      description: "See how teams are organized across the company (view only)",
      mode: "directory",
      canActForSelf: false,
      canActForTeam: false,
    };
  }
  if (isTeamLeadRole(r)) {
    return {
      title: "My teams",
      description: "Teams and departments connected to your reporting line",
      mode: "team",
      canActForSelf: false,
      canActForTeam: true,
    };
  }
  return {
    title: "Teams overview",
    description: "Organization structure across departments and reporting lines",
    mode: "org",
    canActForSelf: false,
    canActForTeam: true,
  };
}

export function roleCanManagePeopleChrome(role: Role) {
  return canManageEmployees(role) || canManageOrgContent(role);
}

