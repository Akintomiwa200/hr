import type { Role } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import { ALL_STAFF, CONTENT_ADMIN_ROLES, DEVICE_ADMIN_ROLES, RECRUITMENT_ROLES } from "@/lib/roles";
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
  PenLine,
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
  { id: "workspace", label: "Workspace", description: "Docs, letters, announcements, search", icon: FileText },
  { id: "account", label: "Account", description: "Settings and permissions", icon: Settings },
];

export const helpArticles: HelpArticle[] = [
  {
    slug: "getting-started",
    title: "Getting started with Smart HR",
    description: "Learn the layout, roles, and everyday workflows in your dashboard.",
    category: "basics",
    icon: LayoutDashboard,
    roles: ALL_STAFF,
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
    roles: ALL_STAFF,
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
        body: "Calendars ship with official Nigeria federal public holidays for the year (Workers’ Day on 1 May, Democracy Day on 12 June, Independence Day on 1 October, and so on). Admins can add, edit, or delete company-specific days on top of that list.",
      },
      {
        heading: "Islamic holidays",
        body: "Eid dates follow published federal calendars and may shift by one day after official moon-sighting announcements from the Ministry of Interior.",
      },
    ],
    faqs: [
      {
        question: "Why can't I edit a holiday?",
        answer: "Only admins can manage holidays. Static seed holidays also cannot be edited until the database is fully synced.",
      },
      {
        question: "Why is Labor Day not in September?",
        answer: "Smart HR uses Nigeria’s public calendar by default. Workers’ Day is 1 May — not the US Labor Day in September.",
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
    roles: ALL_STAFF,
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
    roles: ALL_STAFF,
    moduleHref: "/attendance",
    sections: [
      {
        heading: "Live today, history, and branches",
        body: "Attendance opens on Live today and updates as soon as a terminal punch arrives. Use History for the last 90 days, filter by branch, and open Machine punches to see every thumbprint — including PINs that are not yet matched to an employee.",
      },
      {
        heading: "ZKTeco hardware",
        body: "Each branch can have one or more terminals. In Attendance → ZKTeco, enter the hardware Device IP (the same value BioTime shows, e.g. 102.88.54.109) and Confirm. Transfer is real-time PUSH — punches appear on Attendance as they happen.",
      },
      {
        heading: "Branches and locations",
        body: "Open Attendance → ZKTeco to create a branch for every office. Assign terminals and employees to that location. Late/present is calculated in the branch timezone. Visiting staff can punch at another branch; the record still shows which terminal they used.",
      },
      {
        heading: "Live terminal status",
        body: "Open Attendance → ZKTeco for live online status per terminal. Punches broadcast attendance_updated and device_ping over SSE so dashboards refresh without a reload.",
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
      {
        question: "Which biometric hardware is supported?",
        answer:
          "ZKTeco terminals that support Cloud Server / ADMS (iclock) — including SpeedFace, MB, K, and F series. Each device is mapped to a company branch by serial number.",
      },
    ],
    relatedSlugs: ["calendar", "leave", "employees", "attendance-devices"],
  },
  {
    slug: "attendance-devices",
    title: "ZKTeco branch terminals",
    description: "Connect ZKTeco hardware at every office location for real-time attendance.",
    category: "time",
    icon: Clock,
    roles: DEVICE_ADMIN_ROLES,
    moduleHref: "/attendance/devices",
    sections: [
      {
        heading: "Create branches first",
        body: "Add each office with its city/address and timezone. Late arrival uses that timezone, not the server’s clock.",
      },
      {
        heading: "Register the serial number",
        body: "On the terminal, open System Info or check the sticker for SN. Register it in Attendance → ZKTeco and assign the device to the correct branch.",
      },
      {
        heading: "Enter the hardware Device IP",
        body: "Open Connect on the terminal. Device IP is the machine’s own address (for example 102.88.54.109), not a Smart HR server value. Device type is PUSH and transfer mode is real-time. Confirm saves the IP and turns real-time punches on.",
      },
      {
        heading: "Real-time PUSH",
        body: "Smart HR listens for punches from the serial number you registered. On an office LAN, Confirm also writes real-time options to the terminal. Over the internet, punches arrive as soon as that serial number is live.",
      },
      {
        heading: "Enroll employees",
        body: "The user ID on the device must match the employee’s ZKTeco PIN (shown on their profile). EMP001 defaults to PIN 1.",
      },
    ],
    relatedSlugs: ["attendance", "employees"],
  },
  {
    slug: "payroll",
    title: "Payroll & compensation",
    description: "Run payroll cycles, view payslip breakdowns, auto deductions, and downloads.",
    category: "pay",
    icon: Wallet,
    roles: ALL_STAFF,
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
        body: "HR and company admins can enable a fixed holiday allowance in Payroll settings. When on, it is added automatically to each new payroll run.",
      },
      {
        heading: "Editing breakdowns",
        body: "Only HR and company admins can edit payslip line items, create runs, or change payroll settings. Managers can preview and download payslips for their direct reports, but cannot edit them.",
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
    roles: ALL_STAFF,
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
        body: "Use People → Onboarding to add someone to the company (account + welcome email + checklist). Use People → Offboarding to remove someone (deactivate access + exit checklist). Task progress lives under To-Dos.",
      },
    ],
    relatedSlugs: ["getting-started", "leave", "attendance"],
  },
  {
    slug: "teams",
    title: "Teams & org chart",
    description: "Browse teams, explore reporting lines, and use the org chart as HR.",
    category: "people",
    icon: Network,
    roles: ALL_STAFF,
    moduleHref: "/teams",
    sections: [
      {
        heading: "Teams hub",
        body: "Open Teams under People to browse every department team. Each card shows headcount, open roles, and a preview of colleagues. Click a team to see members and reporting structure.",
        bullets: [
          "Your team is highlighted at the top when you belong to a department",
          "Search by team name or colleague name",
          "All staff can browse teams and the company directory",
        ],
      },
      {
        heading: "Team detail",
        body: "Each team page shows the hierarchy for that department, a searchable member list, and open job postings. Click any person to open their profile.",
      },
      {
        heading: "Org chart",
        body: "Org Chart shows the full company tree. Filter by department when you need a narrower view.",
      },
      {
        heading: "Create departments (HR / Admin)",
        body: "HR and Company Admins open Departments in the sidebar to create, edit, or remove departments. Changes refresh live on Org Chart, Teams, and the employee directory.",
        bullets: [
          "Use Add department to create a new unit",
          "Assign people to departments from Employees / onboarding",
          "Cannot delete a department that still has employees",
        ],
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
    roles: RECRUITMENT_ROLES,
    moduleHref: "/recruitment",
    sections: [
      {
        heading: "Job postings",
        body: "Create roles with description, requirements, responsibilities, and benefits. Set status to OPEN so the role appears live on the public Careers page (/careers).",
      },
      {
        heading: "Careers → apply → pipeline",
        body: "Candidates apply on Careers without logging in. Applications land in Recruitment with source “Careers page”; HR gets a notification and can move them through stages, interviews, and hire.",
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
    roles: ALL_STAFF,
    moduleHref: "/performance",
    sections: [
      {
        heading: "KPI library",
        body: "HR and managers define KPIs with targets, weights, and optional department or role scope. Company-wide KPIs apply to everyone; scoped KPIs only attach to matching people when a cycle activates.",
      },
      {
        heading: "Review cycles",
        body: "Create a cycle with dates, deadlines, linked KPIs, and enrollment (all staff or selected departments/roles). Activate to enroll eligible people, notify them, and optionally post a company announcement.",
      },
      {
        heading: "Settings & scoring",
        body: "HR/admins set rating scale, auto-overall from weighted KPIs, and whether activating a cycle should notify people and publish an announcement. Mixed metric types are normalized onto the rating scale.",
      },
      {
        heading: "Self-appraisal",
        body: "Employees score each KPI, describe achievements, and submit before the deadline. Status then moves to manager review.",
      },
      {
        heading: "Manager review",
        body: "Managers score KPIs, add feedback, and complete the appraisal. Overall rating is calculated from weighted, normalized KPI scores.",
      },
      {
        heading: "Insights & departments",
        body: "Use the Insights tab for completion and rating trends. Department pages also list related KPIs and link back to Performance.",
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
    roles: CONTENT_ADMIN_ROLES,
    moduleHref: "/documents",
    sections: [
      {
        heading: "Document library",
        body: "Upload and categorize HR documents. Company Admins and HR manage shared folders and company files.",
      },
      {
        heading: "Search",
        body: "Documents appear in global Search results when you search by title.",
      },
    ],
    relatedSlugs: ["search", "employees", "letters"],
  },
  {
    slug: "letters",
    title: "Letters & forms",
    description: "Create HR letters and forms in the portal and issue them in real time.",
    category: "workspace",
    icon: PenLine,
    roles: CONTENT_ADMIN_ROLES,
    moduleHref: "/letters",
    sections: [
      {
        heading: "Create in the portal",
        body: "Company Admins and HR open Letters & forms in the sidebar. Start from a built-in letter or form (offer, appointment, salary certificate, warning, leave form, and more) or a blank template. Edit the body with merge fields such as employee name, job title, and salary.",
      },
      {
        heading: "Issue live",
        body: "Publish a template, then issue a letter or assign a form to one or more people. They get an in-app notification. Dashboards refresh over live events so another HR user sees new templates immediately.",
      },
      {
        heading: "Employee response",
        body: "Employees open the notification to acknowledge a letter or complete a form. HR can print any issued letter from the document page.",
      },
    ],
    steps: [
      { title: "Open Letters & forms", body: "Use the sidebar under More (HR and Company Admin)." },
      { title: "Create a template", body: "Pick a starter or start blank, then save. Changes appear live." },
      { title: "Issue or assign", body: "Select employees and send. They are notified in the portal." },
    ],
    relatedSlugs: ["documents", "employees", "announcements"],
  },
  {
    slug: "announcements",
    title: "Announcements & notifications",
    description: "Publish company news and stay informed.",
    category: "workspace",
    icon: Megaphone,
    roles: ALL_STAFF,
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
    roles: ALL_STAFF,
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
    roles: ALL_STAFF,
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
        body: "After editing phone, address, or notification toggles, click Save Preferences. A toast notification confirms your updates were stored.",
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
    roles: ALL_STAFF,
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
