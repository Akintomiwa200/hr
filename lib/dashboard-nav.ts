import type { Role } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Bell,
  Search,
  Calendar,
  Users,
  Network,
  UsersRound,
  CalendarOff,
  Clock,
  Wallet,
  Medal,
  GraduationCap,
  Briefcase,
  UserSearch,
  CalendarClock,
  Megaphone,
  FileText,
  CircleHelp,
  Settings,
  Activity,
  Router,
  Plug2,
  CreditCard,
  BookOpen,
  CheckSquare,
  ListTodo,
  UserMinus,
  UserPlus,
  Trash2,
  BarChart3,
  PenLine,
  StickyNote,
  MessageSquare,
  MessageCircle,
  HandCoins,
  Building2,
  Headset,
  ScrollText,
  NotebookPen,
  Cake,
  ShieldCheck,
} from "lucide-react";
import { CHECKLIST_ADMIN_ROLES, CHECKLIST_TEMPLATE_ROLES, CHECKLIST_VIEW_ROLES } from "@/lib/checklist/access";
import {
  ALL_STAFF,
  ALL_ROLES,
  DEVICE_ADMIN_ROLES,
  DASHBOARD_ROLES,
  INTEGRATION_ADMIN_ROLES,
  ORG_CHART_ROLES,
  PAYROLL_ADMIN_ROLES,
  PAYROLL_OPERATIONS_ROLES,
  PAYROLL_VIEW_ROLES,
  LOAN_VIEW_ROLES,
  PEOPLE_ADMIN_ROLES,
  PEOPLE_DIRECTORY_ROLES,
  PERFORMANCE_VIEW_ROLES,
  CONTENT_ADMIN_ROLES,
  DAILY_REPORTING_ROLES,
  BONUS_ADMIN_ROLES,
  BONUS_VIEW_ROLES,
  RECRUITMENT_ROLES,
  SETTINGS_ROLES,
  SUBSCRIPTION_ADMIN_ROLES,
  SUPER_ADMIN_ONLY,
  REPORTS_VIEW_ROLES,
  hasRole,
  isSuperAdmin,
  normalizeRole,
} from "@/lib/roles";

export type NavItem = {
  id: string;
  href: string;
  label: string;
  pageTitle: string;
  icon: LucideIcon;
  roles: Role[];
  badge?: number;
  match?: (pathname: string) => boolean;
  subItems?: NavSubItem[];
};

export type NavSubItem = {
  id: string;
  href: string;
  label: string;
  pageTitle: string;
  roles: Role[];
  badge?: number;
  match?: (pathname: string) => boolean;
  subItems?: NavSubItem[];
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const dashboardNavSections: NavSection[] = [
  {
    title: "PINNED",
    items: [
      {
        id: "department-updates",
        href: "/announcements",
        label: "Department updates",
        pageTitle: "Department updates",
        icon: Megaphone,
        roles: ALL_STAFF,
      },
    ]
  },
  {
    title: "MAIN",
    items: [
      {
        id: "dashboard",
        href: "/dashboard",
        label: "Dashboard",
        pageTitle: "Dashboard",
        icon: LayoutDashboard,
        roles: DASHBOARD_ROLES,
      },
      {
        id: "hr-metrics",
        href: "/reports",
        label: "HR Metrics",
        pageTitle: "HR Metrics",
        icon: BarChart3,
        roles: REPORTS_VIEW_ROLES,
        match: (pathname) => pathname.startsWith("/reports") && !pathname.startsWith("/reports/audit"),
      },
      {
        id: "audit-trail",
        href: "/reports/audit",
        label: "Audit Trail",
        pageTitle: "Audit Trail",
        icon: FileText,
        roles: ["COMPANY_ADMIN", "HR"],
      },
      {
        id: "team-management",
        href: "/teams",
        label: "Team Management",
        pageTitle: "Team Management",
        icon: UsersRound,
        roles: PEOPLE_DIRECTORY_ROLES,
      },
      {
        id: "logbook",
        href: "/attendance",
        label: "Logbook",
        pageTitle: "Logbook",
        icon: FileText,
        roles: ALL_STAFF,
        subItems: [
          {
            id: "attendance",
            href: "/attendance",
            label: "Attendance",
            pageTitle: "Attendance",
            roles: ALL_STAFF,
            match: (pathname) =>
              pathname === "/attendance" ||
              (pathname.startsWith("/attendance/") &&
                !pathname.startsWith("/attendance/devices")),
          },
          {
            id: "leave",
            href: "/leave",
            label: "Leave",
            pageTitle: "Leave",
            roles: ALL_STAFF,
          },
          {
            id: "summary-report",
            href: "/reports/summary",
            label: "Summary report",
            pageTitle: "Summary report",
            roles: REPORTS_VIEW_ROLES,
          }
        ]
      },
      {
        id: "employees",
        href: "/employees",
        label: "Employees",
        pageTitle: "Employees",
        icon: Users,
        roles: PEOPLE_DIRECTORY_ROLES,
        match: (pathname) =>
          pathname === "/employees" ||
          (pathname.startsWith("/employees/") &&
            !pathname.startsWith("/employees/new")) ||
          pathname.startsWith("/bonuses") ||
          pathname.startsWith("/branches"),
        subItems: [
          {
            id: "employee-list",
            href: "/employees",
            label: "Employee List",
            pageTitle: "Employees",
            roles: PEOPLE_DIRECTORY_ROLES,
            match: (pathname) =>
              pathname === "/employees" ||
              (pathname.startsWith("/employees/") &&
                !pathname.startsWith("/employees/new")),
          },
          {
            id: "org-chart",
            href: "/departments",
            label: "Org Chart",
            pageTitle: "Org Chart",
            roles: ORG_CHART_ROLES,
            match: (pathname) =>
              (pathname === "/departments" || pathname.startsWith("/departments/")) &&
              !pathname.startsWith("/departments/manage"),
          },
          {
            id: "departments-manage",
            href: "/departments/manage",
            label: "Departments",
            pageTitle: "Departments",
            roles: PEOPLE_ADMIN_ROLES,
            match: (pathname) => pathname.startsWith("/departments/manage"),
          },
          {
            id: "branches",
            href: "/branches",
            label: "Branches",
            pageTitle: "Branches",
            roles: DEVICE_ADMIN_ROLES,
            match: (pathname) => pathname.startsWith("/branches"),
          },
          {
            id: "bonus-overview",
            href: "/bonuses",
            label: "Bonuses",
            pageTitle: "Bonuses",
            roles: BONUS_VIEW_ROLES,
            match: (pathname) => pathname === "/bonuses",
          },
          {
            id: "bonus-awards",
            href: "/bonuses/awards",
            label: "Bonus awards",
            pageTitle: "Bonus awards",
            roles: BONUS_VIEW_ROLES,
            match: (pathname) =>
              pathname.startsWith("/bonuses/awards") &&
              pathname !== "/bonuses/awards/new",
          },
          {
            id: "bonus-new-award",
            href: "/bonuses/awards/new",
            label: "Create bonus award",
            pageTitle: "Create bonus award",
            roles: BONUS_ADMIN_ROLES,
          },
          {
            id: "bonus-plans",
            href: "/bonuses/plans",
            label: "Bonus plans",
            pageTitle: "Bonus plans",
            roles: BONUS_ADMIN_ROLES,
            match: (pathname) => pathname.startsWith("/bonuses/plans"),
          },
          {
            id: "bonus-payouts",
            href: "/bonuses/payouts",
            label: "Bonus payouts",
            pageTitle: "Bonus payouts",
            roles: BONUS_VIEW_ROLES,
            match: (pathname) => pathname.startsWith("/bonuses/payouts"),
          },
          {
            id: "bonus-settings",
            href: "/bonuses/settings",
            label: "Bonus settings",
            pageTitle: "Bonus settings",
            roles: BONUS_ADMIN_ROLES,
            match: (pathname) => pathname.startsWith("/bonuses/settings"),
          }
        ]
      },
      {
        id: "shift-scheduling",
        href: "/holidays?category=shifts",
        label: "Shift & Scheduling",
        pageTitle: "Shift & Scheduling",
        icon: Calendar,
        roles: ALL_STAFF,
      },
      {
        id: "payroll-compensation",
        href: "/payroll",
        label: "Payroll & Compensation",
        pageTitle: "Payroll & Compensation",
        icon: Wallet,
        roles: PAYROLL_VIEW_ROLES,
        subItems: [
          {
            id: "payroll",
            href: "/payroll",
            label: "Payroll",
            pageTitle: "Payroll",
            roles: PAYROLL_VIEW_ROLES,
            match: (pathname) =>
              pathname === "/payroll" ||
              (pathname.startsWith("/payroll/") &&
                !pathname.startsWith("/payroll/deductions") &&
                !pathname.startsWith("/payroll/runs")),
          },
          {
            id: "payroll-runs",
            href: "/payroll/runs",
            label: "Payroll runs",
            pageTitle: "Payroll runs",
            roles: PAYROLL_OPERATIONS_ROLES,
            match: (pathname) => pathname.startsWith("/payroll/runs"),
          },
          {
            id: "payroll-deductions",
            href: "/payroll/deductions",
            label: "Deductions",
            pageTitle: "Payroll Deductions",
            roles: PAYROLL_ADMIN_ROLES,
            match: (pathname) => pathname.startsWith("/payroll/deductions"),
          },
          {
            id: "loans",
            href: "/loans",
            label: "Loans",
            pageTitle: "Loans & repayment",
            roles: LOAN_VIEW_ROLES,
            match: (pathname) => pathname === "/loans" || pathname.startsWith("/loans/"),
          }
        ]
      },
      {
        id: "recruitment",
        href: "/recruitment",
        label: "Recruitment",
        pageTitle: "Recruitment",
        icon: Briefcase,
        roles: RECRUITMENT_ROLES,
        subItems: [
          {
            id: "jobs",
            href: "/recruitment",
            label: "Jobs",
            pageTitle: "Recruitment",
            roles: RECRUITMENT_ROLES,
            match: (pathname) =>
              pathname === "/recruitment" ||
              (/^\/recruitment\/[^/]+$/.test(pathname) &&
                !pathname.startsWith("/recruitment/candidates") &&
                !pathname.startsWith("/recruitment/interviews")),
          },
          {
            id: "candidates",
            href: "/recruitment/candidates",
            label: "Candidates",
            pageTitle: "Candidates",
            roles: RECRUITMENT_ROLES,
            match: (pathname) => pathname.startsWith("/recruitment/candidates"),
          },
          {
            id: "interviews",
            href: "/recruitment/interviews",
            label: "Interviews",
            pageTitle: "Interviews",
            roles: RECRUITMENT_ROLES,
          }
        ]
      },
      {
        id: "training-development",
        href: "/performance",
        label: "Training & Development",
        pageTitle: "Training & Development",
        icon: GraduationCap,
        roles: PERFORMANCE_VIEW_ROLES,
        subItems: [
          {
            id: "kpi-goals",
            href: "/performance?tab=kpis",
            label: "KPIs & Goals",
            pageTitle: "KPIs & Goals",
            roles: PERFORMANCE_VIEW_ROLES,
            subItems: [
              { id: "target-setting", href: "/performance/kpis", label: "Target Setting & OKRs", pageTitle: "Target Setting & OKRs", roles: ["COMPANY_ADMIN", "HR"] },
              { id: "kpi-dashboards", href: "/performance/kpi-dashboard", label: "KPI Dashboards", pageTitle: "KPI Dashboards", roles: ["COMPANY_ADMIN", "HR"] },
              { id: "performance-tracking", href: "/performance/tracking", label: "Performance Tracking", pageTitle: "Performance Tracking", roles: PERFORMANCE_VIEW_ROLES },
            ],
          },
          {
            id: "learning-upskilling",
            href: "/training",
            label: "Learning & Upskilling",
            pageTitle: "Learning & Upskilling",
            roles: PERFORMANCE_VIEW_ROLES,
            subItems: [
              { id: "course-catalog", href: "/training/catalog", label: "Course Catalog", pageTitle: "Course Catalog", roles: PERFORMANCE_VIEW_ROLES },
              { id: "training-assignments", href: "/training/assignments", label: "Training Assignments", pageTitle: "Training Assignments", roles: PERFORMANCE_VIEW_ROLES },
              { id: "skills-competencies", href: "/training/skills", label: "Skills & Competencies", pageTitle: "Skills & Competencies", roles: PERFORMANCE_VIEW_ROLES },
              { id: "certifications-licenses", href: "/training/certifications", label: "Certifications & Licenses", pageTitle: "Certifications & Licenses", roles: PERFORMANCE_VIEW_ROLES },
            ],
          },
          {
            id: "appraisal-cycles",
            href: "/performance",
            label: "Appraisal Cycles",
            pageTitle: "Appraisal Cycles",
            roles: PERFORMANCE_VIEW_ROLES,
            subItems: [
              { id: "review-cycle-setup", href: "/performance/cycles", label: "Review Cycle Setup", pageTitle: "Review Cycle Setup", roles: ["COMPANY_ADMIN", "HR"] },
              { id: "360-feedback", href: "/performance/feedback", label: "360° Feedback", pageTitle: "360° Feedback", roles: PERFORMANCE_VIEW_ROLES },
              { id: "self-assessments", href: "/performance/self-assessment", label: "Self-Assessments", pageTitle: "Self-Assessments", roles: PERFORMANCE_VIEW_ROLES },
              { id: "appraisal-analytics", href: "/performance/analytics", label: "Appraisal Analytics", pageTitle: "Appraisal Analytics", roles: ["COMPANY_ADMIN", "HR"] },
            ],
          },
          {
            id: "staff-reviews-changes",
            href: "/performance/staff-changes",
            label: "Staff Reviews & Changes",
            pageTitle: "Staff Reviews & Changes",
            roles: PERFORMANCE_VIEW_ROLES,
            subItems: [
              { id: "performance-review-forms", href: "/performance/review-forms", label: "Performance Review Forms", pageTitle: "Performance Review Forms", roles: PERFORMANCE_VIEW_ROLES },
              { id: "promotion-recommendations", href: "/performance/promotions", label: "Promotion Recommendations", pageTitle: "Promotion Recommendations", roles: PERFORMANCE_VIEW_ROLES },
              { id: "salary-increment-requests", href: "/performance/salary-increments", label: "Salary Increment Requests", pageTitle: "Salary Increment Requests", roles: PERFORMANCE_VIEW_ROLES },
              { id: "approval-workflows", href: "/performance/approvals", label: "Approval Workflows", pageTitle: "Approval Workflows", roles: ["COMPANY_ADMIN", "HR"] },
            ],
          },
        ],
      },
      {
        id: "benefits-welfare",
        href: "/benefits",
        label: "Benefits & Welfare",
        pageTitle: "Benefits",
        icon: Medal,
        roles: ALL_STAFF,
      },
      {
        id: "documents",
        href: "/documents",
        label: "Documents",
        pageTitle: "Documents",
        icon: FileText,
        roles: ALL_STAFF,
      }
    ]
  },
  {
    title: "WORKSPACE",
    items: [
      {
        id: "chat",
        href: "/chat",
        label: "Chat",
        pageTitle: "Chat",
        icon: MessageCircle,
        roles: ALL_STAFF,
        match: (pathname) =>
          pathname === "/chat" || pathname.startsWith("/chat/"),
      },
      {
        id: "notifications",
        href: "/notifications",
        label: "Notifications",
        pageTitle: "Notifications",
        icon: Bell,
        roles: ALL_STAFF,
      },
      {
        id: "notes",
        href: "/notes",
        label: "Notes",
        pageTitle: "Notes",
        icon: StickyNote,
        roles: ALL_STAFF,
      },
      {
        id: "birthdays",
        href: "/birthdays",
        label: "Birthdays",
        pageTitle: "Birthday celebrations",
        icon: Cake,
        roles: ALL_STAFF,
      },
      {
        id: "daily-reporting",
        href: "/daily-reporting",
        label: "Daily reporting",
        pageTitle: "Daily reporting",
        icon: NotebookPen,
        roles: DAILY_REPORTING_ROLES,
      },
      {
        id: "checklist-onboarding",
        href: "/checklist/onboarding",
        label: "Onboarding",
        pageTitle: "Onboarding",
        icon: UserPlus,
        roles: CHECKLIST_ADMIN_ROLES,
        match: (pathname) =>
          pathname === "/checklist/onboarding" || pathname.startsWith("/checklist/onboarding/"),
      },
      {
        id: "checklist-offboarding",
        href: "/checklist/offboarding",
        label: "Offboarding",
        pageTitle: "Offboarding",
        icon: UserMinus,
        roles: CHECKLIST_ADMIN_ROLES,
        match: (pathname) =>
          pathname === "/checklist/offboarding" || pathname.startsWith("/checklist/offboarding/"),
      },
      {
        id: "resignation",
        href: "/resignation",
        label: "Resignation",
        pageTitle: "Resignation",
        icon: UserMinus,
        roles: ALL_STAFF,
        match: (pathname) =>
          pathname === "/resignation" || pathname.startsWith("/resignation/"),
      },
      {
        id: "checklist-todos",
        href: "/checklist/todos",
        label: "To-Dos",
        pageTitle: "To-Dos",
        icon: ListTodo,
        roles: CHECKLIST_VIEW_ROLES,
        match: (pathname) => pathname === "/checklist/todos",
      },
      {
        id: "offboarded-staff",
        href: "/offboarded-staff",
        label: "Offboarded staff",
        pageTitle: "Offboarded staff",
        icon: Trash2,
        roles: PEOPLE_ADMIN_ROLES,
      },
      {
        id: "letters",
        href: "/letters",
        label: "Letters & forms",
        pageTitle: "Letters & forms",
        icon: PenLine,
        roles: CONTENT_ADMIN_ROLES,
        match: (pathname) => pathname === "/letters" || pathname.startsWith("/letters/"),
      },
      {
        id: "integrations",
        href: "/settings/integrations",
        label: "Integrations",
        pageTitle: "Integrations",
        icon: Plug2,
        roles: INTEGRATION_ADMIN_ROLES,
      },
      {
        id: "subscription",
        href: "/settings/subscription",
        label: "Subscription",
        pageTitle: "Subscription",
        icon: CreditCard,
        roles: [...SUBSCRIPTION_ADMIN_ROLES, "HR"],
      }
    ]
  }
];

/**
 * Employees get a deliberately small self-service workspace. Everything that
 * belongs to HR, finance, recruitment or org administration is left out so the
 * sidebar matches the server-side access rules.
 */
export const employeeNavSections: NavSection[] = [
  {
    title: "PINNED",
    items: [
      {
        id: "department-updates",
        href: "/announcements",
        label: "Department updates",
        pageTitle: "Department updates",
        icon: Megaphone,
        roles: ALL_STAFF,
      },
    ],
  },
  {
    title: "MAIN",
    items: [
      {
        id: "dashboard",
        href: "/dashboard",
        label: "Dashboard",
        pageTitle: "Dashboard",
        icon: LayoutDashboard,
        roles: DASHBOARD_ROLES,
      },
      {
        id: "logbook",
        href: "/attendance",
        label: "Logbook",
        pageTitle: "Logbook",
        icon: FileText,
        roles: ALL_STAFF,
        subItems: [
          {
            id: "attendance",
            href: "/attendance",
            label: "Attendance summary",
            pageTitle: "Attendance summary",
            roles: ALL_STAFF.filter((role) => role !== "MANAGER"),
            match: (pathname) =>
              pathname === "/attendance" ||
              (pathname.startsWith("/attendance/") &&
                !pathname.startsWith("/attendance/devices")),
          },
          {
            id: "leave",
            href: "/leave",
            label: "Leave",
            pageTitle: "Leave",
            roles: ALL_STAFF,
          },
        ],
      },
      {
        id: "payroll-compensation",
        href: "/payroll",
        label: "Payroll & Compensation",
        pageTitle: "Payroll & Compensation",
        icon: Wallet,
        roles: PAYROLL_VIEW_ROLES,
        subItems: [
          {
            id: "payroll",
            href: "/payroll",
            label: "Payroll & payslips",
            pageTitle: "My payslips",
            roles: PAYROLL_VIEW_ROLES,
            match: (pathname) =>
              pathname === "/payroll" || pathname.startsWith("/payroll/"),
          },
          {
            id: "loans",
            href: "/loans",
            label: "Loans",
            pageTitle: "Loans & repayment",
            roles: LOAN_VIEW_ROLES,
            match: (pathname) => pathname === "/loans" || pathname.startsWith("/loans/"),
          },
        ],
      },
      {
        id: "training-development",
        href: "/performance",
        label: "Training & Development",
        pageTitle: "Training & Development",
        icon: GraduationCap,
        roles: PERFORMANCE_VIEW_ROLES,
        subItems: [
          {
            id: "kpi-goals", href: "/performance?tab=kpis", label: "KPIs & Goals", pageTitle: "KPIs & Goals", roles: PERFORMANCE_VIEW_ROLES,
            subItems: [
              { id: "target-setting", href: "/performance/kpis", label: "Target Setting & OKRs", pageTitle: "Target Setting & OKRs", roles: ["COMPANY_ADMIN", "HR"] },
              { id: "kpi-dashboards", href: "/performance/kpi-dashboard", label: "KPI Dashboards", pageTitle: "KPI Dashboards", roles: ["COMPANY_ADMIN", "HR"] },
              { id: "performance-tracking", href: "/performance/tracking", label: "Performance Tracking", pageTitle: "Performance Tracking", roles: PERFORMANCE_VIEW_ROLES },
            ],
          },
          {
            id: "learning-upskilling", href: "/training", label: "Learning & Upskilling", pageTitle: "Learning & Upskilling", roles: PERFORMANCE_VIEW_ROLES,
            subItems: [
              { id: "course-catalog", href: "/training/catalog", label: "Course Catalog", pageTitle: "Course Catalog", roles: PERFORMANCE_VIEW_ROLES },
              { id: "training-assignments", href: "/training/assignments", label: "Training Assignments", pageTitle: "Training Assignments", roles: PERFORMANCE_VIEW_ROLES },
              { id: "skills-competencies", href: "/training/skills", label: "Skills & Competencies", pageTitle: "Skills & Competencies", roles: PERFORMANCE_VIEW_ROLES },
              { id: "certifications-licenses", href: "/training/certifications", label: "Certifications & Licenses", pageTitle: "Certifications & Licenses", roles: PERFORMANCE_VIEW_ROLES },
            ],
          },
          {
            id: "appraisal-cycles", href: "/performance", label: "Appraisal Cycles", pageTitle: "Appraisal Cycles", roles: PERFORMANCE_VIEW_ROLES,
            subItems: [
              { id: "review-cycle-setup", href: "/performance/cycles", label: "Review Cycle Setup", pageTitle: "Review Cycle Setup", roles: ["COMPANY_ADMIN", "HR"] },
              { id: "360-feedback", href: "/performance/feedback", label: "360° Feedback", pageTitle: "360° Feedback", roles: PERFORMANCE_VIEW_ROLES },
              { id: "self-assessments", href: "/performance/self-assessment", label: "Self-Assessments", pageTitle: "Self-Assessments", roles: PERFORMANCE_VIEW_ROLES },
              { id: "appraisal-analytics", href: "/performance/analytics", label: "Appraisal Analytics", pageTitle: "Appraisal Analytics", roles: ["COMPANY_ADMIN", "HR"] },
            ],
          },
          {
            id: "staff-reviews-changes", href: "/performance/staff-changes", label: "Staff Reviews & Changes", pageTitle: "Staff Reviews & Changes", roles: PERFORMANCE_VIEW_ROLES,
            subItems: [
              { id: "performance-review-forms", href: "/performance/review-forms", label: "Performance Review Forms", pageTitle: "Performance Review Forms", roles: PERFORMANCE_VIEW_ROLES },
              { id: "promotion-recommendations", href: "/performance/promotions", label: "Promotion Recommendations", pageTitle: "Promotion Recommendations", roles: PERFORMANCE_VIEW_ROLES },
              { id: "salary-increment-requests", href: "/performance/salary-increments", label: "Salary Increment Requests", pageTitle: "Salary Increment Requests", roles: PERFORMANCE_VIEW_ROLES },
              { id: "approval-workflows", href: "/performance/approvals", label: "Approval Workflows", pageTitle: "Approval Workflows", roles: ["COMPANY_ADMIN", "HR"] },
            ],
          },
        ],
      },
      {
        id: "benefits-welfare",
        href: "/benefits",
        label: "Benefits & Welfare",
        pageTitle: "Benefits",
        icon: Medal,
        roles: ALL_STAFF,
      },
      {
        id: "documents",
        href: "/documents",
        label: "Documents",
        pageTitle: "Documents",
        icon: FileText,
        roles: ALL_STAFF,
      },
    ],
  },
  {
    title: "WORKSPACE",
    items: [
      {
        id: "chat",
        href: "/chat",
        label: "Chat",
        pageTitle: "Chat",
        icon: MessageCircle,
        roles: ALL_STAFF,
        match: (pathname) =>
          pathname === "/chat" || pathname.startsWith("/chat/"),
      },
      {
        id: "notifications",
        href: "/notifications",
        label: "Notifications",
        pageTitle: "Notifications",
        icon: Bell,
        roles: ALL_STAFF,
      },
      {
        id: "notes",
        href: "/notes",
        label: "Notes",
        pageTitle: "Notes",
        icon: StickyNote,
        roles: ALL_STAFF,
      },
      {
        id: "birthdays",
        href: "/birthdays",
        label: "Birthdays",
        pageTitle: "Birthday celebrations",
        icon: Cake,
        roles: ALL_STAFF,
      },
      {
        id: "resignation",
        href: "/resignation",
        label: "Resignation",
        pageTitle: "Resignation",
        icon: UserMinus,
        roles: ALL_STAFF,
        match: (pathname) =>
          pathname === "/resignation" || pathname.startsWith("/resignation/"),
      },
      {
        id: "checklist-todos",
        href: "/checklist/todos",
        label: "To-Dos",
        pageTitle: "To-Dos",
        icon: ListTodo,
        roles: CHECKLIST_VIEW_ROLES,
        match: (pathname) => pathname === "/checklist/todos",
      },
    ],
  },
];

/**
 * Super Admin works on the platform, not inside a single company, so the
 * sidebar swaps the company workspace for platform-owner tools.
 */
export const superAdminNavSections: NavSection[] = [
  {
    title: "PLATFORM OVERVIEW",
    items: [
      {
        id: "platform-overview",
        href: "/dashboard",
        label: "Overview",
        pageTitle: "Platform overview",
        icon: LayoutDashboard,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-global-activity",
        href: "/admin/activity",
        label: "Global activity logs",
        pageTitle: "Global activity logs",
        icon: ScrollText,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-audit-trail",
        href: "/admin/control/audit-trail",
        label: "Super Admin audit trail",
        pageTitle: "Super Admin audit trail",
        icon: NotebookPen,
        roles: SUPER_ADMIN_ONLY,
      },
    ],
  },
  {
    title: "TENANT & USER MANAGEMENT",
    items: [
      {
        id: "platform-companies",
        href: "/admin/companies",
        label: "Companies",
        pageTitle: "Companies",
        icon: Building2,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-impersonation",
        href: "/admin/control/impersonation",
        label: "Impersonation logs & access",
        pageTitle: "Impersonation logs & access",
        icon: UserSearch,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-users",
        href: "/admin/users",
        label: "Tenant user directory",
        pageTitle: "Tenant user directory",
        icon: Users,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-staff",
        href: "/admin/control/staff",
        label: "Platform staff roster",
        pageTitle: "Platform staff roster",
        icon: UserPlus,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-rbac",
        href: "/admin/control/permissions",
        label: "Super RBAC & permissions",
        pageTitle: "Super RBAC & permissions",
        icon: CheckSquare,
        roles: SUPER_ADMIN_ONLY,
      },
    ],
  },
  {
    title: "COMMERCIALS & REVENUE",
    items: [
      {
        id: "platform-billing",
        href: "/admin/billing",
        label: "Billing & plans",
        pageTitle: "Billing & plans",
        icon: CreditCard,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-usage",
        href: "/admin/control/usage",
        label: "Usage & metered billing",
        pageTitle: "Usage & metered billing",
        icon: BarChart3,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-ledger",
        href: "/admin/control/ledger",
        label: "Invoices & transactions",
        pageTitle: "Invoices & transactions",
        icon: Wallet,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-credits",
        href: "/admin/control/credits",
        label: "Coupons & credit management",
        pageTitle: "Coupons & credit management",
        icon: HandCoins,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-dunning",
        href: "/admin/control/dunning",
        label: "Dunning & collections",
        pageTitle: "Dunning & collections",
        icon: CalendarClock,
        roles: SUPER_ADMIN_ONLY,
      },
    ],
  },
  {
    title: "SYSTEM OPERATIONS & CONFIG",
    items: [
      {
        id: "platform-activity",
        href: "/admin/settings",
        label: "Global core settings",
        pageTitle: "Global core settings",
        icon: Settings,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-integrations",
        href: "/admin/control/integrations",
        label: "API & integrations gateway",
        pageTitle: "API & integrations gateway",
        icon: Plug2,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-flags",
        href: "/admin/control/feature-flags",
        label: "Feature flags & canaries",
        pageTitle: "Feature flags & canaries",
        icon: Activity,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-templates",
        href: "/admin/control/templates",
        label: "Data seeders & templates",
        pageTitle: "Data seeders & templates",
        icon: BookOpen,
        roles: SUPER_ADMIN_ONLY,
      },
    ],
  },
  {
    title: "SUPPORT & COMMUNICATIONS",
    items: [
      {
        id: "platform-support",
        href: "/support",
        label: "Support desk",
        pageTitle: "Support Desk",
        icon: Headset,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-broadcasts",
        href: "/admin/control/broadcasts",
        label: "System broadcasts",
        pageTitle: "System broadcasts",
        icon: Megaphone,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-crm",
        href: "/admin/control/accounts",
        label: "CRM & account notes",
        pageTitle: "CRM & account notes",
        icon: StickyNote,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-notifications",
        href: "/admin/control/delivery-logs",
        label: "Email & notification logs",
        pageTitle: "Email & notification logs",
        icon: MessageSquare,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-notes",
        href: "/notes",
        label: "Notes",
        pageTitle: "Notes",
        icon: StickyNote,
        roles: SUPER_ADMIN_ONLY,
      },
    ],
  },
  {
    title: "INFRASTRUCTURE & SECURITY",
    items: [
      {
        id: "platform-health",
        href: "/admin/control/health",
        label: "System health & uptime",
        pageTitle: "System health & uptime",
        icon: Activity,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-database",
        href: "/admin/control/database",
        label: "Database & tenant capacity",
        pageTitle: "Database & tenant capacity",
        icon: Router,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-backups",
        href: "/admin/control/backups",
        label: "Backups & disaster recovery",
        pageTitle: "Backups & disaster recovery",
        icon: Clock,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-security",
        href: "/admin/control/security",
        label: "Security & IP access",
        pageTitle: "Security & IP access",
        icon: CheckSquare,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-privacy",
        href: "/admin/control/privacy",
        label: "Compliance & data privacy",
        pageTitle: "Compliance & data privacy",
        icon: ShieldCheck,
        roles: SUPER_ADMIN_ONLY,
      },
    ],
  },
];

export const settingsNavItem: NavItem = {
  id: "settings",
  href: "/settings",
  label: "Settings",
  pageTitle: "Settings",
  icon: Settings,
  roles: SETTINGS_ROLES,
};

export const brandIcon = Activity;

export function getNavSections(role: Role): NavSection[] {
  if (isSuperAdmin(role)) return superAdminNavSections;
  if (["EMPLOYEE", "SUPERVISOR"].includes(normalizeRole(role))) return employeeNavSections;
  return dashboardNavSections;
}

/** Platform admins get their settings entry from the PLATFORM SETTINGS section. */
export function getSettingsNavItem(role: Role): NavItem | null {
  return isSuperAdmin(role) ? null : settingsNavItem;
}

export function getAllNavItems(role: Role): NavItem[] {
  const settingsItem = getSettingsNavItem(role);
  return [
    ...getNavSections(role).flatMap((s) => s.items),
    ...(settingsItem ? [settingsItem] : []),
  ].filter((item) => hasRole(role, item.roles));
}

export function isNavMatch(
  pathname: string,
  item: Pick<NavItem, "href" | "match">
): boolean {
  if (item.match) return item.match(pathname);
  const hrefPath = item.href.split("?")[0];
  if (pathname === hrefPath) return true;
  if (hrefPath === "/dashboard") return false;
  return pathname.startsWith(`${hrefPath}/`);
}

export function getActiveNavId(pathname: string, items: NavItem[]): string | null {
  let activeId: string | null = null;
  let bestHrefLen = -1;
  let bestIndex = Infinity;

  const flattened: (NavItem | NavSubItem)[] = [];
  const visit = (item: NavItem | NavSubItem) => {
    flattened.push(item);
    item.subItems?.forEach(visit);
  };
  items.forEach(visit);

  flattened.forEach((item, index) => {
    if (!isNavMatch(pathname, item)) return;

    const hrefLen = item.href.length;
    if (hrefLen > bestHrefLen || (hrefLen === bestHrefLen && index < bestIndex)) {
      bestHrefLen = hrefLen;
      bestIndex = index;
      activeId = item.id;
    }
  });

  return activeId;
}

const nestedPageTitles: { test: (pathname: string) => boolean; title: string }[] = [
  {
    test: (p) => p === "/notifications",
    title: "Notifications",
  },
  {
    test: (p) => p === "/bonuses/awards/new",
    title: "New bonus award",
  },
  {
    test: (p) => /^\/bonuses\/awards\/[^/]+$/.test(p),
    title: "Bonus award",
  },
  {
    test: (p) => p === "/bonuses/plans",
    title: "Bonus plans",
  },
  {
    test: (p) => p === "/bonuses/payouts",
    title: "Bonus payouts",
  },
  {
    test: (p) => p === "/bonuses/settings" || p === "/settings/bonuses",
    title: "Bonus settings",
  },
  {
    test: (p) => p === "/bonuses",
    title: "Bonuses",
  },
  {
    test: (p) => p === "/daily-reporting/new",
    title: "New daily report",
  },
  {
    test: (p) => /^\/daily-reporting\/[^/]+$/.test(p),
    title: "Daily report",
  },
  {
    test: (p) => p === "/admin/companies",
    title: "Companies",
  },
  {
    test: (p) => /^\/admin\/companies\/[^/]+\/users$/.test(p),
    title: "Company Users",
  },
  {
    test: (p) => /^\/admin\/companies\/[^/]+\/employees$/.test(p),
    title: "Company Employees",
  },
  {
    test: (p) => /^\/admin\/companies\/[^/]+\/billing$/.test(p),
    title: "Company Billing",
  },
  {
    test: (p) => /^\/admin\/companies\/[^/]+\/activity$/.test(p),
    title: "Company Activity",
  },
  {
    test: (p) => /^\/admin\/companies\/[^/]+$/.test(p),
    title: "Company Details",
  },
  {
    test: (p) => /^\/admin\/users\/[^/]+$/.test(p),
    title: "User profile",
  },
  {
    test: (p) => p === "/admin/users",
    title: "Platform users",
  },
  {
    test: (p) => p === "/admin/billing",
    title: "Billing & plans",
  },
  {
    test: (p) => p === "/admin/activity",
    title: "Activity log",
  },
  {
    test: (p) => p === "/admin/settings",
    title: "Platform settings",
  },
  {
    test: (p) => p === "/employees/new" || p === "/checklist/onboarding",
    title: "Onboarding",
  },
  {
    test: (p) => /^\/employees\/[^/]+\/attendance/.test(p),
    title: "Employee Attendance",
  },
  {
    test: (p) => /^\/employees\/[^/]+\/leave/.test(p),
    title: "Employee Leave",
  },
  {
    test: (p) => /^\/employees\/[^/]+\/payroll/.test(p),
    title: "Employee Payroll",
  },
  {
    test: (p) => /^\/employees\/[^/]+\/resignation/.test(p),
    title: "Employee Resignation",
  },
  {
    test: (p) => p.startsWith("/payroll/runs"),
    title: "Payroll runs",
  },
  {
    test: (p) => p.startsWith("/payroll/deductions"),
    title: "Payroll Deductions",
  },
  {
    test: (p) => p.startsWith("/loans"),
    title: "Loans & repayment",
  },
  {
    test: (p) => /^\/employees\/[^/]+$/.test(p),
    title: "Employee Profile",
  },
  {
    test: (p) => /^\/performance\/appraisals\/[^/]+$/.test(p),
    title: "Appraisal",
  },
  {
    test: (p) => /^\/performance\/cycles\/[^/]+$/.test(p),
    title: "Review Cycle",
  },
  {
    test: (p) => p === "/performance",
    title: "Appraisal",
  },
  {
    test: (p) => p === "/performance/staff-changes",
    title: "Staff Reviews & Changes",
  },
  {
    test: (p) => p === "/training" || p.startsWith("/training/"),
    title: "Training",
  },
  {
    test: (p) => p === "/recruitment/interviews",
    title: "Interviews",
  },
  {
    test: (p) => p === "/recruitment/candidates",
    title: "Candidates",
  },
  {
    test: (p) => /^\/recruitment\/candidates\/[^/]+$/.test(p),
    title: "Candidate Profile",
  },
  {
    test: (p) => p === "/recruitment/settings",
    title: "Recruitment Settings",
  },
  {
    test: (p) => p === "/bulk-messaging",
    title: "Bulk Messaging",
  },
  {
    test: (p) => p === "/announcements",
    title: "Announcements",
  },
  {
    test: (p) =>
      /^\/recruitment\/[^/]+$/.test(p) &&
      !p.startsWith("/recruitment/candidates") &&
      !p.startsWith("/recruitment/interviews") &&
      !p.startsWith("/recruitment/settings"),
    title: "Job Details",
  },
  {
    test: (p) => p === "/departments/manage",
    title: "Departments",
  },
  {
    test: (p) => /^\/departments\/[^/]+$/.test(p),
    title: "Department",
  },
  {
    test: (p) => p === "/help/contact",
    title: "Contact Support",
  },
  {
    test: (p) => p === "/support",
    title: "Support Desk",
  },
  {
    test: (p) => p === "/help/guides",
    title: "All Guides",
  },
  {
    test: (p) => p.startsWith("/help/category/"),
    title: "Help Category",
  },
  {
    test: (p) => p.startsWith("/help/") && p !== "/help",
    title: "Help Guide",
  },
  {
    test: (p) => p.startsWith("/letters/documents/"),
    title: "Letter or form",
  },
  {
    test: (p) => /^\/letters\/[^/]+$/.test(p),
    title: "Edit letter or form",
  },
  {
    test: (p) => p.startsWith("/letters"),
    title: "Letters & forms",
  },
  {
    test: (p) => /^\/documents\/[^/]+$/.test(p),
    title: "Folder Documents",
  },
  {
    test: (p) => p === "/reports/audit" || p.startsWith("/reports/audit/"),
    title: "Audit Reports",
  },
  {
    test: (p) => p === "/reports/summary",
    title: "Summary report",
  },
  {
    test: (p) => p.startsWith("/reports"),
    title: "Reports",
  },
  {
    test: (p) => p.startsWith("/checklist/tasks/"),
    title: "Task documents",
  },
  {
    test: (p) => p.startsWith("/checklist/onboarding"),
    title: "Onboarding",
  },
  {
    test: (p) => p.startsWith("/checklist/offboarding"),
    title: "Offboarding",
  },
  {
    test: (p) => p.startsWith("/checklist/settings"),
    title: "Checklist Templates",
  },
  {
    test: (p) => p === "/checklist/todos",
    title: "To-Dos",
  },
  {
    test: (p) => p.startsWith("/checklist/"),
    title: "Checklist",
  },
  {
    test: (p) => p === "/offboarded-staff",
    title: "Offboarded staff",
  },
  {
    test: (p) => p === "/benefits",
    title: "Benefits",
  },
  {
    test: (p) => p === "/docs",
    title: "Documentation",
  },
  {
    test: (p) => p === "/attendance/devices",
    title: "Attendance Devices",
  },
  {
    test: (p) => /^\/resignation\/[^/]+$/.test(p),
    title: "Resignation Details",
  },
  {
    test: (p) => p === "/settings/resignation",
    title: "Resignation settings",
  },
  {
    test: (p) => p === "/settings/subscription",
    title: "Subscription",
  },
  {
    test: (p) => p === "/settings/integrations",
    title: "Integrations",
  },
  {
    test: (p) => p === "/settings",
    title: "Settings",
  },
];

function employeePageTitle(pathname: string): string | null {
  if (pathname === "/performance" || pathname.startsWith("/performance/")) return "Appraisal";
  if (pathname === "/attendance") return "Attendance summary";
  if (pathname === "/payroll") return "My payslips";
  if (pathname === "/loans" || pathname.startsWith("/loans/")) return "Loans & repayment";
  return null;
}

export function getPageTitle(pathname: string, role: Role): string {
  if (normalizeRole(role) === "EMPLOYEE") {
    const title = employeePageTitle(pathname);
    if (title) return title;
  }

  for (const rule of nestedPageTitles) {
    if (rule.test(pathname)) return rule.title;
  }

  const items = getAllNavItems(role);
  const activeId = getActiveNavId(pathname, items);
  const active = items.find((item) => item.id === activeId);
  if (active) return active.pageTitle;

  return "Dashboard";
}

export function getActiveNavItem(pathname: string, role: Role): NavItem | null {
  const items = getAllNavItems(role);
  const activeId = getActiveNavId(pathname, items);
  return items.find((item) => item.id === activeId) ?? null;
}
