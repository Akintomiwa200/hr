import type { Role } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Briefcase,
  Calendar,
  CalendarOff,
  CircleHelp,
  Clock,
  FileText,
  LayoutDashboard,
  Medal,
  Megaphone,
  Network,
  Search,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

export type HelpSection = {
  heading: string;
  body: string;
  bullets?: string[];
};

export type HelpStep = {
  title: string;
  body: string;
};

export type HelpFaq = {
  question: string;
  answer: string;
};

export type HelpArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  icon: LucideIcon;
  roles: Role[];
  moduleHref?: string;
  sections: HelpSection[];
  steps?: HelpStep[];
  faqs?: HelpFaq[];
  relatedSlugs?: string[];
};

export type HelpCategory = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const helpCategories: HelpCategory[] = [
  { id: "basics", label: "Basics", description: "Orientation and navigation", icon: CircleHelp },
  { id: "people", label: "People", description: "Employees, teams, org chart", icon: Users },
  { id: "time", label: "Time & Leave", description: "Calendar, leave, attendance", icon: CalendarOff },
  { id: "pay", label: "Payroll", description: "Compensation and payslips", icon: Wallet },
  { id: "talent", label: "Talent", description: "Recruitment and performance", icon: Briefcase },
  { id: "workspace", label: "Workspace", description: "Docs, announcements, search", icon: FileText },
  { id: "account", label: "Account", description: "Settings and permissions", icon: Settings },
];

export const helpArticles: HelpArticle[] = [
  {
    slug: "getting-started",
    title: "Getting started with Smart HR",
    description: "Learn the layout, roles, and everyday workflows in your dashboard.",
    category: "basics",
    icon: LayoutDashboard,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    moduleHref: "/dashboard",
    sections: [
      {
        heading: "Your dashboard",
        body: "The dashboard is your home base. Admins see company-wide metrics, managers see team stats, and employees see personal summaries including attendance, leave, and latest payslip.",
        bullets: [
          "Use the greeting header to orient yourself each day",
          "Review the Upcoming Schedule widget for holidays, leave, and interviews",
          "Jump into any module from the sidebar or quick links",
        ],
      },
      {
        heading: "Sidebar navigation",
        body: "Modules are grouped into Main, People, Time & Leave, Talent, and More. Only one section item is highlighted at a time based on the page you are viewing.",
      },
      {
        heading: "Roles at a glance",
        body: "Smart HR supports three roles. Admins manage the full organization. Managers oversee their team. Employees manage their own records and requests.",
        bullets: [
          "Admin — full access including payroll, holidays, and recruitment",
          "Manager — team visibility, leave approvals, performance reviews",
          "Employee — personal profile, leave requests, attendance check-in",
        ],
      },
    ],
    steps: [
      { title: "Sign in", body: "Use your company email and password at the login page." },
      { title: "Explore the dashboard", body: "Review stats and upcoming events for today." },
      { title: "Open a module", body: "Pick Employees, Calendar, or Leave from the sidebar." },
      { title: "Use Search", body: "Find people, holidays, documents, and jobs from the Search page." },
    ],
    relatedSlugs: ["calendar", "search", "roles-permissions"],
  },
  {
    slug: "calendar",
    title: "Calendar & schedule",
    description: "View holidays, leave, payroll runs, interviews, and attendance by day.",
    category: "time",
    icon: Calendar,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    moduleHref: "/holidays",
    sections: [
      {
        heading: "Week view",
        body: "The calendar shows a horizontal week strip. Tap any day to highlight it in purple and load that day's schedule below.",
      },
      {
        heading: "Schedule cards",
        body: "Each event appears as a card with an icon, title, and time. Cards link to the relevant module — leave, payroll, recruitment, or attendance.",
      },
      {
        heading: "Employee attendance table",
        body: "Below the calendar, the attendance table lists employees for the selected day with clock-in/out times, filters, and CSV export.",
      },
      {
        heading: "Managing holidays",
        body: "Admins can add, edit, and delete company holidays from the calendar when the holiday database is enabled.",
      },
    ],
    faqs: [
      {
        question: "Why can't I edit a holiday?",
        answer: "Only admins can manage holidays. Static seed holidays also cannot be edited until the database is fully synced.",
      },
      {
        question: "How do I jump to a specific date?",
        answer: "Use links from Search, the dashboard Upcoming Schedule widget, or open /holidays?date=YYYY-MM-DD directly.",
      },
    ],
    relatedSlugs: ["leave", "attendance", "payroll"],
  },
  {
    slug: "leave",
    title: "Leave management",
    description: "Submit, track, and approve time-off requests.",
    category: "time",
    icon: CalendarOff,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    moduleHref: "/leave",
    sections: [
      {
        heading: "Requesting leave",
        body: "Employees submit leave from the Leave page by choosing type, dates, and reason. Requests start as Pending until reviewed.",
      },
      {
        heading: "Approvals",
        body: "Managers and admins can approve or reject pending requests. Approved leave appears on the calendar for the selected date range.",
      },
      {
        heading: "Employee leave history",
        body: "Open any employee profile and navigate to their Leave tab to see personal history and status.",
      },
    ],
    steps: [
      { title: "Open Leave", body: "Go to Time & Leave → Leave in the sidebar." },
      { title: "Fill the form", body: "Choose leave type, start/end dates, and add a reason." },
      { title: "Submit", body: "Your manager or HR admin will review the request." },
      { title: "Track status", body: "Check the list or calendar once approved." },
    ],
    relatedSlugs: ["calendar", "attendance", "employees"],
  },
  {
    slug: "attendance",
    title: "Attendance tracking",
    description: "Check in, review records, and export daily attendance.",
    category: "time",
    icon: Clock,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    moduleHref: "/attendance",
    sections: [
      {
        heading: "Daily check-in",
        body: "Employees use the Check In button on the Attendance page to record arrival. Check out when leaving for the day.",
      },
      {
        heading: "Team monitoring",
        body: "Managers and admins see team attendance records with status badges for Present, Remote, Late, and other states.",
      },
      {
        heading: "Calendar integration",
        body: "The Calendar page shows who checked in on the selected day and links back to full attendance reports.",
      },
    ],
    faqs: [
      {
        question: "Can I edit past attendance?",
        answer: "Employees record their own check-ins. Admins should coordinate corrections through HR policy.",
      },
    ],
    relatedSlugs: ["calendar", "leave", "employees"],
  },
  {
    slug: "payroll",
    title: "Payroll & compensation",
    description: "Run payroll cycles, view payslip breakdowns, auto deductions, and downloads.",
    category: "pay",
    icon: Wallet,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    moduleHref: "/payroll",
    sections: [
      {
        heading: "Payslip breakdown",
        body: "Every payslip shows earnings and deductions line by line. Auto items include lateness, absence, tax, and holiday allowance when enabled.",
      },
      {
        heading: "Download payslip",
        body: "Employees, managers, and HR can open any accessible payslip and download an HTML payslip file (print or save as PDF from the browser).",
      },
      {
        heading: "Auto deductions",
        body: "Lateness and absence are calculated from attendance records for the pay period. Tax is applied as a percentage of gross pay.",
      },
      {
        heading: "Holiday allowance",
        body: "Admins and managers can enable a fixed holiday allowance in Payroll settings. When on, it is added automatically to each new payroll run.",
      },
      {
        heading: "Editing breakdowns",
        body: "HR and managers can edit payslip line items for their team — add damage deductions, overtime, or adjust auto-calculated amounts before marking as paid.",
      },
    ],
    relatedSlugs: ["calendar", "employees", "settings"],
  },
  {
    slug: "employees",
    title: "Employees & profiles",
    description: "Browse staff, view profiles, and manage employee records.",
    category: "people",
    icon: Users,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    moduleHref: "/employees",
    sections: [
      {
        heading: "Employee directory",
        body: "The Employees page lists all staff with search, filters, and export. Click a name to open the full profile.",
      },
      {
        heading: "Profile tabs",
        body: "Each employee has dedicated views for attendance, leave, and payroll accessible from their profile sub-pages.",
      },
      {
        heading: "Onboarding",
        body: "Admins and managers add employees from Onboarding (/employees/new). Each new account gets default password password123, works immediately at login, and receives a welcome email with credentials via Nodemailer.",
      },
    ],
    relatedSlugs: ["getting-started", "leave", "attendance"],
  },
  {
    slug: "teams",
    title: "Teams & org chart",
    description: "Explore the visual organization chart, departments, and reporting lines.",
    category: "people",
    icon: Network,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    moduleHref: "/teams",
    sections: [
      {
        heading: "Visual org chart",
        body: "Open Org Chart under People to see the full company hierarchy. Each card shows an employee with their title, department, and role. Lines connect managers to direct reports.",
        bullets: [
          "Switch between Org chart and Departments tabs",
          "Filter by department or search by name or job title",
          "Click any person to open their employee profile",
        ],
      },
      {
        heading: "Reporting structure",
        body: "The chart is built from manager assignments on employee records. Set a manager when onboarding or editing an employee to update the tree automatically.",
      },
      {
        heading: "Departments view",
        body: "Use the Departments tab to browse department cards, open department details, and manage department names and descriptions as an admin.",
      },
      {
        heading: "Department detail",
        body: "Each department page shows a focused hierarchy for that team plus a member list with reporting lines and open job postings.",
      },
    ],
    relatedSlugs: ["employees", "recruitment"],
  },
  {
    slug: "recruitment",
    title: "Recruitment & candidates",
    description: "Post jobs, manage candidates, schedule Google Calendar interviews with Meet, and submit reviews.",
    category: "talent",
    icon: Briefcase,
    roles: ["ADMIN", "MANAGER"],
    moduleHref: "/recruitment",
    sections: [
      {
        heading: "Job postings",
        body: "Create roles with description, requirements, responsibilities, and benefits. Add candidates from the job detail page or track them on Candidates.",
      },
      {
        heading: "Google Calendar & Meet",
        body: "Connect Google from Recruitment settings. Scheduled interviews create calendar events with Google Meet links and email invites to candidates.",
      },
      {
        heading: "Interview reviews",
        body: "After interviews, submit structured reviews with rating, recommendation, strengths, and notes from the candidate profile.",
      },
      {
        heading: "Interview calendar",
        body: "Real interview dates appear on the company calendar and on the Interviews page. Join Meet links directly from candidate profiles.",
      },
    ],
    relatedSlugs: ["calendar", "employees"],
  },
  {
    slug: "performance",
    title: "Performance & KPIs",
    description: "Create KPIs, run review cycles, self-appraise, and complete manager reviews.",
    category: "talent",
    icon: Medal,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    moduleHref: "/performance",
    sections: [
      {
        heading: "KPI library",
        body: "HR and managers define KPIs with targets, weights, and conditions (department or role). KPIs are attached to review cycles.",
      },
      {
        heading: "Review cycles",
        body: "Create a cycle with dates, deadlines, enrollment conditions, and linked KPIs. Activate to enroll all eligible employees and their managers.",
      },
      {
        heading: "Self-appraisal",
        body: "Employees score each KPI, describe achievements, and submit self-appraisal before the deadline. Status moves to manager review.",
      },
      {
        heading: "Manager review",
        body: "Managers score KPIs, add feedback, and complete the appraisal. Overall rating is calculated from weighted KPI scores.",
      },
    ],
    relatedSlugs: ["employees", "settings"],
  },
  {
    slug: "documents",
    title: "Documents",
    description: "Store and find company and employee documents.",
    category: "workspace",
    icon: FileText,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    moduleHref: "/documents",
    sections: [
      {
        heading: "Document library",
        body: "Upload and categorize HR documents. Employees see company-wide files plus their own assigned documents.",
      },
      {
        heading: "Search",
        body: "Documents appear in global Search results when you search by title.",
      },
    ],
    relatedSlugs: ["search", "employees"],
  },
  {
    slug: "announcements",
    title: "Announcements & notifications",
    description: "Publish company news and stay informed.",
    category: "workspace",
    icon: Megaphone,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    moduleHref: "/announcements",
    sections: [
      {
        heading: "Company announcements",
        body: "Admins publish updates visible to the organization. Everyone can read announcements from the sidebar.",
      },
      {
        heading: "Notification preferences",
        body: "Control announcement alerts from Settings → Notification preferences.",
      },
    ],
    relatedSlugs: ["settings", "search"],
  },
  {
    slug: "search",
    title: "Search workspace",
    description: "Find employees, holidays, documents, jobs, and announcements quickly.",
    category: "workspace",
    icon: Search,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    moduleHref: "/search",
    sections: [
      {
        heading: "Global search",
        body: "Use the Search page or the topbar quick search to query across modules. Results are grouped by type.",
      },
      {
        heading: "Holiday results",
        body: "Searching for a holiday name opens the calendar on that date automatically.",
      },
    ],
    relatedSlugs: ["getting-started", "calendar", "employees"],
  },
  {
    slug: "settings",
    title: "Account settings",
    description: "Update your profile, contact details, notification preferences, and find support.",
    category: "account",
    icon: Settings,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    moduleHref: "/settings",
    sections: [
      {
        heading: "Opening settings",
        body: "Go to Settings from the sidebar footer or your profile menu. All users can manage notifications; employees can also update phone and address.",
        bullets: [
          "Sidebar → Settings (above your profile)",
          "Profile menu → Settings",
          "Help Center → Account settings card",
        ],
      },
      {
        heading: "Profile information",
        body: "Your email and role are managed by HR and shown read-only. Employees linked to an HR record can edit phone and address, then save from the Profile card.",
      },
      {
        heading: "Notification preferences",
        body: "Control which updates you receive. Changes apply after you click Save Preferences.",
        bullets: [
          "Leave request updates — approvals and rejections",
          "Payroll notifications — when payslips are ready",
          "Company announcements — org-wide news",
          "Performance reviews — review cycle alerts",
        ],
      },
      {
        heading: "Saving changes",
        body: "After editing phone, address, or notification toggles, click Save Preferences. A success message confirms your updates were stored.",
      },
      {
        heading: "Help from settings",
        body: "The Help & support section on the Settings page links to the Help Center, this guide, and contact support without leaving your workflow.",
      },
    ],
    steps: [
      { title: "Open Settings", body: "Use the sidebar or profile dropdown." },
      { title: "Update profile fields", body: "Edit phone and address if you have an employee record." },
      { title: "Adjust notifications", body: "Toggle the alerts you want to receive." },
      { title: "Save", body: "Click Save Preferences and wait for confirmation." },
    ],
    faqs: [
      {
        question: "Why can't I edit my email or role?",
        answer: "Email and role are assigned by your administrator. Contact HR if they need to change.",
      },
      {
        question: "Do notification toggles apply immediately?",
        answer: "Yes, after you save preferences. They control in-app notification categories tied to your account.",
      },
      {
        question: "Where is the Settings guide?",
        answer: "Click Settings guide in the page header or Help & support card on the Settings page.",
      },
    ],
    relatedSlugs: ["roles-permissions", "getting-started", "announcements"],
  },
  {
    slug: "roles-permissions",
    title: "Roles & permissions",
    description: "Understand what each role can access in Smart HR.",
    category: "account",
    icon: Bell,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    sections: [
      {
        heading: "Admin",
        body: "Full organization access — employees, payroll, holidays, recruitment, departments, and all settings.",
      },
      {
        heading: "Manager",
        body: "Team-focused access — approve leave, view team attendance, manage recruitment, and conduct reviews.",
      },
      {
        heading: "Employee",
        body: "Self-service access — own profile, leave requests, check-in, payslips, documents, and calendar view.",
      },
    ],
    relatedSlugs: ["getting-started", "settings"],
  },
];

export const globalHelpFaqs: HelpFaq[] = [
  {
    question: "How do I reset my password?",
    answer: "Contact your HR administrator or email support@smarthr.com to request a password reset.",
  },
  {
    question: "Where is the calendar?",
    answer: "Open Calendar in the sidebar (under Main). It lives at /holidays and also responds to /calendar.",
  },
  {
    question: "Why don't I see recruitment?",
    answer: "Recruitment is limited to Admin and Manager roles. Employees are redirected to the dashboard.",
  },
  {
    question: "How do I export data?",
    answer: "Employees, attendance, and dashboard metrics can be exported via Export buttons on the Employees table, Calendar attendance table, and related pages.",
  },
  {
    question: "Who do I contact for support?",
    answer: "Email support@smarthr.com or visit Help → Contact support for more options.",
  },
];

export function getHelpArticle(slug: string) {
  return helpArticles.find((article) => article.slug === slug) ?? null;
}

export function getHelpArticlesForRole(role: Role) {
  return helpArticles.filter((article) => article.roles.includes(role));
}

export function getHelpArticlesByCategory(categoryId: string, role: Role) {
  return getHelpArticlesForRole(role).filter((article) => article.category === categoryId);
}

export function searchHelpArticles(query: string, role: Role) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return getHelpArticlesForRole(role).filter((article) => {
    const haystack = [
      article.title,
      article.description,
      article.category,
      ...article.sections.flatMap((s) => [s.heading, s.body, ...(s.bullets ?? [])]),
      ...(article.steps?.flatMap((s) => [s.title, s.body]) ?? []),
      ...(article.faqs?.flatMap((f) => [f.question, f.answer]) ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function getRelatedArticles(slug: string, role: Role) {
  const article = getHelpArticle(slug);
  if (!article?.relatedSlugs?.length) return [];

  return article.relatedSlugs
    .map((relatedSlug) => getHelpArticle(relatedSlug))
    .filter((item): item is HelpArticle => !!item && item.roles.includes(role));
}
