export type ApiAuthType = "session" | "device_key" | "public" | "oauth";

export type ApiEndpoint = {
  id: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  title: string;
  description: string;
  auth: ApiAuthType;
  roles?: string[];
  query?: { name: string; description: string }[];
  body?: Record<string, unknown>;
  response?: Record<string, unknown>;
  tags?: string[];
};

export type ApiCategory = {
  id: string;
  title: string;
  description: string;
  icon: string;
  endpoints: ApiEndpoint[];
};

export type ApiCatalog = {
  version: string;
  baseUrl: string;
  generatedAt: string;
  auth: {
    session: string;
    device: string;
    realtime: string;
  };
  categories: ApiCategory[];
  stats: { endpoints: number; categories: number };
};

export function buildApiCatalog(baseUrl: string): ApiCatalog {
  const base = baseUrl.replace(/\/$/, "");

  const categories: ApiCategory[] = [
    {
      id: "overview",
      title: "Overview & Realtime",
      description: "Authentication, live events, and API discovery",
      icon: "radio",
      endpoints: [
        {
          id: "catalog",
          method: "GET",
          path: "/api/catalog",
          title: "API catalog",
          description: "Machine-readable catalog of all Smart HR endpoints (this documentation as JSON).",
          auth: "public",
          response: { version: "1.0", categories: "…", stats: { endpoints: 0, categories: 0 } },
        },
        {
          id: "events",
          method: "GET",
          path: "/api/events",
          title: "Realtime SSE stream",
          description: "Server-Sent Events for live dashboard updates. Requires session cookie.",
          auth: "session",
          response: { type: "attendance_updated | device_ping | leave_updated | …", data: {} },
          tags: ["SSE", "realtime"],
        },
      ],
    },
    {
      id: "auth",
      title: "Authentication",
      description: "Login, signup, and session management",
      icon: "shield",
      endpoints: [
        {
          id: "auth-login",
          method: "POST",
          path: "/api/auth/login",
          title: "Sign in",
          description: "Authenticate with email and password. Sets HTTP-only session cookie.",
          auth: "public",
          body: { email: "admin@smarthr.com", password: "password123" },
          response: { success: true },
        },
        {
          id: "auth-signup",
          method: "POST",
          path: "/api/auth/signup",
          title: "Sign up",
          description: "Create a new trial account and employee profile.",
          auth: "public",
          body: { firstName: "Jane", lastName: "Doe", email: "jane@company.com", password: "••••••••" },
        },
        {
          id: "auth-logout",
          method: "POST",
          path: "/api/auth/logout",
          title: "Sign out",
          description: "Destroy the current session cookie.",
          auth: "session",
        },
      ],
    },
    {
      id: "attendance",
      title: "Attendance",
      description: "Web check-in, device punches, and kiosk integration",
      icon: "clock",
      endpoints: [
        {
          id: "attendance-check-in",
          method: "POST",
          path: "/api/attendance/check-in",
          title: "Web check-in",
          description: "Employee check-in from the dashboard (method: WEB).",
          auth: "session",
          roles: ["EMPLOYEE"],
        },
        {
          id: "attendance-check-out",
          method: "POST",
          path: "/api/attendance/check-out",
          title: "Web check-out",
          description: "Employee check-out from the dashboard (method: WEB).",
          auth: "session",
          roles: ["EMPLOYEE"],
        },
        {
          id: "device-punch",
          method: "POST",
          path: "/api/attendance/device",
          title: "Device punch",
          description: "Record check-in, check-out, or auto-toggle from kiosk/biometric app.",
          auth: "device_key",
          body: {
            action: "toggle",
            employeeCode: "EMP001",
            timestamp: "2026-08-02T09:05:00.000Z",
            externalId: "device-event-12345",
          },
          response: { success: true, action: "check_in", status: "PRESENT", method: "DEVICE" },
          tags: ["device", "kiosk"],
        },
        {
          id: "device-health",
          method: "GET",
          path: "/api/attendance/device",
          title: "Device ping & spec",
          description: "Health check, last-seen update, and full integration spec. Without key returns public docs.",
          auth: "device_key",
          tags: ["device", "kiosk"],
        },
        {
          id: "device-sync",
          method: "POST",
          path: "/api/attendance/device/sync",
          title: "Batch device sync",
          description: "Replay offline punch events from mobile or kiosk storage.",
          auth: "device_key",
          body: {
            events: [
              { action: "check_in", employeeCode: "EMP001", externalId: "offline-001" },
            ],
          },
        },
        {
          id: "device-docs",
          method: "GET",
          path: "/api/attendance/device/docs",
          title: "Device integration docs",
          description: "HR admin view: spec, registered devices, online status.",
          auth: "session",
          roles: ["COMPANY_ADMIN", "HR"],
        },
        {
          id: "devices-list",
          method: "GET",
          path: "/api/attendance/devices",
          title: "List devices",
          description: "All registered attendance devices.",
          auth: "session",
          roles: ["COMPANY_ADMIN", "HR"],
        },
        {
          id: "devices-create",
          method: "POST",
          path: "/api/attendance/devices",
          title: "Register device",
          description: "Create a kiosk/device and receive a one-time API key.",
          auth: "session",
          roles: ["COMPANY_ADMIN", "HR"],
          body: { name: "Reception Kiosk", location: "Main lobby" },
          response: { device: { id: "…", name: "…", apiKey: "dev_…" } },
        },
        {
          id: "devices-update",
          method: "PATCH",
          path: "/api/attendance/devices/:id",
          title: "Update device",
          description: "Rename, disable, or regenerate API key.",
          auth: "session",
          roles: ["COMPANY_ADMIN", "HR"],
          body: { isActive: true, regenerateKey: false },
        },
        {
          id: "devices-delete",
          method: "DELETE",
          path: "/api/attendance/devices/:id",
          title: "Delete device",
          description: "Remove a registered device permanently.",
          auth: "session",
          roles: ["COMPANY_ADMIN", "HR"],
        },
      ],
    },
    {
      id: "leave",
      title: "Leave",
      description: "Leave requests and approvals",
      icon: "calendar",
      endpoints: [
        {
          id: "leave-create",
          method: "POST",
          path: "/api/leave",
          title: "Submit leave request",
          description: "Employee submits a new leave request for approval.",
          auth: "session",
          body: { type: "ANNUAL", startDate: "2026-08-10", endDate: "2026-08-14", reason: "Vacation" },
        },
        {
          id: "leave-action",
          method: "PATCH",
          path: "/api/leave/:id",
          title: "Approve or reject",
          description: "Manager/HR approves or rejects a pending request.",
          auth: "session",
          roles: ["COMPANY_ADMIN", "HR", "MANAGER", "SUPERVISOR"],
          body: { action: "approve" },
        },
      ],
    },
    {
      id: "employees",
      title: "Employees",
      description: "Workforce records and onboarding",
      icon: "users",
      endpoints: [
        {
          id: "employees-list",
          method: "GET",
          path: "/api/employees",
          title: "List employees",
          description: "Search and filter the employee directory.",
          auth: "session",
          query: [
            { name: "search", description: "Name, email, or employee code" },
            { name: "status", description: "ACTIVE | INACTIVE" },
            { name: "role", description: "COMPANY_ADMIN | HR | MANAGER | SUPERVISOR | EMPLOYEE" },
          ],
        },
        {
          id: "employees-create",
          method: "POST",
          path: "/api/employees",
          title: "Create employee",
          description: "Onboard a new employee with optional welcome email.",
          auth: "session",
          roles: ["COMPANY_ADMIN", "HR", "MANAGER"],
          body: {
            firstName: "Alex",
            lastName: "Johnson",
            email: "alex@company.com",
            jobTitle: "Engineer",
            departmentId: "…",
          },
        },
        {
          id: "employees-get",
          method: "GET",
          path: "/api/employees/:id",
          title: "Get employee",
          description: "Single employee profile with department and manager.",
          auth: "session",
        },
        {
          id: "employees-update",
          method: "PATCH",
          path: "/api/employees/:id",
          title: "Update employee",
          description: "Edit profile, job details, or status.",
          auth: "session",
          roles: ["COMPANY_ADMIN", "HR", "MANAGER"],
        },
        {
          id: "employees-bulk",
          method: "POST",
          path: "/api/employees/bulk",
          title: "Bulk actions",
          description: "Bulk deactivate or department reassignment.",
          auth: "session",
          roles: ["COMPANY_ADMIN", "HR", "MANAGER"],
        },
      ],
    },
    {
      id: "payroll",
      title: "Payroll",
      description: "Pay runs, payslips, and compensation settings",
      icon: "wallet",
      endpoints: [
        { id: "payroll-list", method: "GET", path: "/api/payroll", title: "List payroll records", description: "Payroll cycles visible to the current user.", auth: "session" },
        { id: "payroll-create", method: "POST", path: "/api/payroll", title: "Create payroll run", description: "Generate payroll for a pay period.", auth: "session", roles: ["COMPANY_ADMIN", "HR"] },
        { id: "payroll-get", method: "GET", path: "/api/payroll/:id", title: "Get payroll record", description: "Single payslip with line items.", auth: "session" },
        { id: "payroll-update", method: "PATCH", path: "/api/payroll/:id", title: "Update payroll", description: "Edit line items or recalculate deductions.", auth: "session", roles: ["COMPANY_ADMIN", "HR"] },
        { id: "payroll-preview", method: "POST", path: "/api/payroll/preview", title: "Preview payroll", description: "Simulate payroll before saving.", auth: "session", roles: ["COMPANY_ADMIN", "HR"] },
        { id: "payroll-settings", method: "GET", path: "/api/payroll/settings", title: "Payroll settings", description: "Tax rates, lateness rules, holiday allowance.", auth: "session", roles: ["COMPANY_ADMIN", "HR"] },
        { id: "payroll-settings-patch", method: "PATCH", path: "/api/payroll/settings", title: "Update settings", description: "Save payroll configuration.", auth: "session", roles: ["COMPANY_ADMIN", "HR"] },
        { id: "payroll-payslip", method: "GET", path: "/api/payroll/:id/payslip", title: "Download payslip", description: "PDF payslip download.", auth: "session" },
      ],
    },
    {
      id: "recruitment",
      title: "Recruitment",
      description: "Jobs, candidates, interviews, and Google Calendar",
      icon: "briefcase",
      endpoints: [
        { id: "jobs-list", method: "GET", path: "/api/jobs", title: "List jobs", description: "Open and closed job postings.", auth: "session" },
        { id: "jobs-create", method: "POST", path: "/api/jobs", title: "Create job", description: "Post a new job opening.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "jobs-update", method: "PATCH", path: "/api/jobs/:id", title: "Update job", description: "Edit job details or status.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "jobs-delete", method: "DELETE", path: "/api/jobs/:id", title: "Delete job", description: "Remove a job posting.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "applications-list", method: "GET", path: "/api/applications", title: "List applications", description: "Candidates per job pipeline.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "applications-create", method: "POST", path: "/api/applications", title: "Add candidate", description: "Add applicant to a job.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "applications-update", method: "PATCH", path: "/api/applications/:id", title: "Update application", description: "Move pipeline stage or edit details.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "interviews-list", method: "GET", path: "/api/interviews", title: "List interviews", description: "Scheduled interviews.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "interviews-create", method: "POST", path: "/api/interviews", title: "Schedule interview", description: "Create interview with optional Google Meet.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "interviews-update", method: "PATCH", path: "/api/interviews/:id", title: "Update interview", description: "Reschedule or cancel.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "interview-reviews", method: "POST", path: "/api/interviews/:id/reviews", title: "Submit review", description: "Interviewer feedback and score.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "google-auth", method: "GET", path: "/api/google/auth", title: "Google OAuth", description: "Start Google Calendar connection.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "google-status", method: "GET", path: "/api/google/status", title: "Google status", description: "Calendar connection state.", auth: "session" },
      ],
    },
    {
      id: "performance",
      title: "Performance",
      description: "KPIs, appraisal cycles, and reviews",
      icon: "medal",
      endpoints: [
        { id: "kpis-list", method: "GET", path: "/api/performance/kpis", title: "List KPIs", description: "KPI definitions library.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "kpis-create", method: "POST", path: "/api/performance/kpis", title: "Create KPI", description: "Add a measurable KPI.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "cycles-list", method: "GET", path: "/api/performance/cycles", title: "List cycles", description: "Appraisal cycles.", auth: "session" },
        { id: "cycles-create", method: "POST", path: "/api/performance/cycles", title: "Create cycle", description: "Start a new review cycle.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "appraisals-update", method: "PATCH", path: "/api/performance/appraisals/:id", title: "Update appraisal", description: "Self or manager review scores.", auth: "session" },
        { id: "reviews-legacy", method: "GET", path: "/api/performance", title: "Legacy reviews", description: "Performance review records.", auth: "session" },
      ],
    },
    {
      id: "organization",
      title: "Organization",
      description: "Departments, holidays, announcements, documents",
      icon: "building",
      endpoints: [
        { id: "departments-list", method: "GET", path: "/api/departments", title: "List departments", description: "Org structure units.", auth: "session" },
        { id: "departments-create", method: "POST", path: "/api/departments", title: "Create department", description: "Add a department/team.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "departments-update", method: "PATCH", path: "/api/departments/:id", title: "Update department", description: "Edit name or description.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "holidays-list", method: "GET", path: "/api/holidays", title: "List holidays", description: "Company calendar events.", auth: "session" },
        { id: "holidays-create", method: "POST", path: "/api/holidays", title: "Create holiday", description: "Add calendar entry.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "announcements-list", method: "GET", path: "/api/announcements", title: "List announcements", description: "Company news feed.", auth: "session" },
        { id: "announcements-create", method: "POST", path: "/api/announcements", title: "Create announcement", description: "Publish company update.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
        { id: "documents-list", method: "GET", path: "/api/documents", title: "List documents", description: "HR document library.", auth: "session" },
        { id: "documents-upload", method: "POST", path: "/api/documents", title: "Upload document", description: "Add file metadata.", auth: "session", roles: ["COMPANY_ADMIN", "HR", "MANAGER"] },
      ],
    },
    {
      id: "utility",
      title: "Search & Settings",
      description: "Global search, profile, and exports",
      icon: "search",
      endpoints: [
        { id: "search", method: "GET", path: "/api/search", title: "Global search", description: "Search employees, docs, jobs, and more.", auth: "session", query: [{ name: "q", description: "Search query" }] },
        { id: "settings-profile", method: "PATCH", path: "/api/settings/profile", title: "Update profile", description: "Phone, address, notification prefs.", auth: "session" },
        { id: "dashboard-export", method: "GET", path: "/api/dashboard/export", title: "Export data", description: "CSV export by type.", auth: "session", query: [{ name: "type", description: "employees | attendance | leave" }] },
      ],
    },
  ];

  const endpoints = categories.flatMap((c) => c.endpoints);

  return {
    version: "1.0",
    baseUrl: base,
    generatedAt: new Date().toISOString(),
    auth: {
      session: "HTTP-only cookie smart-hr-session — obtain via POST /api/auth/login",
      device: "Header X-Device-Key or Authorization: Bearer <key> — register at /attendance/devices",
      realtime: "GET /api/events (SSE) — events: attendance_updated, device_ping, leave_updated, payroll_updated, …",
    },
    categories,
    stats: { endpoints: endpoints.length, categories: categories.length },
  };
}

export function flattenEndpoints(catalog: ApiCatalog) {
  return catalog.categories.flatMap((cat) =>
    cat.endpoints.map((ep) => ({ ...ep, category: cat.id, categoryTitle: cat.title }))
  );
}
