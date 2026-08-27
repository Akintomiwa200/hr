"use client";

import Link from "next/link";
import type { ApiCatalog } from "@/lib/api-catalog";
import { DocsCodeBlock } from "./docs-code-block";

type Props = {
  categoryId: string;
  catalog: ApiCatalog;
  query: string;
};

function Panel({ children, border = "border-gray-200", gradient = "from-gray-50/80" }: { children: React.ReactNode; border?: string; gradient?: string }) {
  return (
    <div className={`rounded-2xl border ${border} bg-gradient-to-br ${gradient} to-white p-6 space-y-6`}>
      {children}
    </div>
  );
}

export function CategoryGuidePanel({ categoryId, catalog, query }: Props) {
  if (query.trim()) return null;
  const base = catalog.baseUrl;

  switch (categoryId) {
    case "overview":
      return (
        <Panel border="border-violet-200" gradient="from-violet-50/80">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">API discovery</h3>
            <p className="text-sm text-gray-500 mb-3">
              Fetch the machine-readable catalog for codegen, Postman import, or internal tooling.
            </p>
            <DocsCodeBlock code={`GET ${base}/api/catalog\n\n# Returns version, baseUrl, auth notes, categories[], stats`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Realtime SSE stream</h3>
            <DocsCodeBlock
              code={`GET ${base}/api/events
Cookie: smart-hr-session=…
Accept: text/event-stream

# Initial: dashboard_updated { connected: true }
# Heartbeat every 25s
# Events: attendance_updated, leave_updated, payroll_updated,
# job_updated, employee_updated, notification_updated,
# department_updated, holiday_updated, announcement_created,
# document_updated, integration_sync, subscription_updated, …`}
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Navigation summary</h3>
            <p className="text-sm text-gray-500 mb-3">Powers header badges: unread notifications, pending leave, team preview.</p>
            <DocsCodeBlock
              code={`GET ${base}/api/nav/summary

{
  "notificationCount": 3,
  "notifications": [{ "id": "…", "title": "…", "href": "/leave" }],
  "pendingLeaveCount": 2,
  "teamMembers": [],
  "canInvite": true
}`}
            />
          </div>
        </Panel>
      );

    case "auth":
      return (
        <Panel border="border-sky-200" gradient="from-sky-50/80">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Session cookie</h3>
            <p className="text-sm text-gray-500 mb-3">
              Login sets HTTP-only <code className="bg-gray-100 px-1 rounded text-xs">smart-hr-session</code>. Include on all
              authenticated requests.
            </p>
            <DocsCodeBlock
              code={`POST ${base}/api/auth/login
Content-Type: application/json

{ "email": "hr@smarthr.com", "password": "password" }

→ { "success": true } + Set-Cookie`}
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Trial signup</h3>
            <DocsCodeBlock
              code={`POST ${base}/api/auth/signup
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@acme.com",
  "password": "password123",
  "plan": "trial"
}

# Creates company, default department, payroll settings, admin EMP001
→ 409 if email exists`}
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Sign out</h3>
            <DocsCodeBlock code={`POST ${base}/api/auth/logout\n\n→ 302 redirect to /login (clears session cookie)`} />
          </div>
        </Panel>
      );

    case "attendance":
      return (
        <Panel border="border-brand-200" gradient="from-brand-50/80">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Quick start — device punch</h3>
            <p className="text-sm text-gray-500 mb-4">
              Register a device in{" "}
              <Link href="/attendance/devices" className="text-brand-600 font-medium hover:underline">
                Attendance → Devices
              </Link>
              , copy the one-time API key, then POST punches. Use <code className="text-xs bg-gray-100 px-1 rounded">externalId</code> for
              idempotent replays.
            </p>
            <DocsCodeBlock
              code={`GET ${base}/api/attendance/device
X-Device-Key: your-device-api-key

POST ${base}/api/attendance/device
X-Device-Key: your-device-api-key
Content-Type: application/json

{
  "action": "toggle",
  "employeeCode": "EMP001",
  "externalId": "punch-${Date.now()}"
}

# Errors: 404 employee, 409 ALREADY_COMPLETED, 400 NO_CHECK_IN`}
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Offline batch sync</h3>
            <DocsCodeBlock
              code={`POST ${base}/api/attendance/device/sync
X-Device-Key: …
Content-Type: application/json

{
  "events": [
    { "action": "check_in", "employeeCode": "EMP001", "externalId": "offline-001" },
    { "action": "check_out", "employeeCode": "EMP001", "externalId": "offline-002" }
  ]
}`}
            />
          </div>
          <p className="text-xs text-gray-500">
            SSE: <code className="bg-gray-100 px-1 rounded">attendance_updated</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">device_ping</code>
          </p>
        </Panel>
      );

    case "leave":
      return (
        <Panel border="border-amber-200" gradient="from-amber-50/80">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Submit leave request</h3>
            <p className="text-sm text-gray-500 mb-3">Requires linked employeeId on session. Notifies HR/managers on create.</p>
            <DocsCodeBlock
              code={`POST ${base}/api/leave
Content-Type: application/json

{
  "type": "ANNUAL",
  "startDate": "2026-08-10",
  "endDate": "2026-08-14",
  "reason": "Family vacation"
}

→ { "success": true }
# SSE: leave_updated { action: "created" }`}
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Approve or reject</h3>
            <DocsCodeBlock
              code={`PATCH ${base}/api/leave/{id}
Content-Type: application/json

{ "action": "approve" }
# or { "action": "reject" }

# Roles: COMPANY_ADMIN, HR, MANAGER, SUPERVISOR`}
            />
          </div>
          <Link href="/leave" className="inline-flex text-xs font-medium text-brand-600 hover:text-brand-700">
            Open leave management →
          </Link>
        </Panel>
      );

    case "employees":
      return (
        <Panel border="border-indigo-200" gradient="from-indigo-50/80">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Create employee</h3>
            <DocsCodeBlock
              code={`POST ${base}/api/employees
Content-Type: application/json

{
  "firstName": "Alex",
  "lastName": "Johnson",
  "email": "alex@company.com",
  "jobTitle": "Engineer",
  "departmentId": "dept_001",
  "role": "EMPLOYEE",
  "sendWelcomeEmail": true
}

→ { "success": true, "employee": {…}, "emailSent": true }
# 402 subscription cap, 409 duplicate email`}
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Bulk actions</h3>
            <DocsCodeBlock
              code={`PATCH ${base}/api/employees/bulk
Content-Type: application/json

{
  "ids": ["emp_001", "emp_002"],
  "action": "set_department",
  "departmentId": "dept_002"
}

# action: deactivate | activate | set_department`}
            />
          </div>
          <Link href="/employees" className="inline-flex text-xs font-medium text-brand-600 hover:text-brand-700">
            Open employee directory →
          </Link>
        </Panel>
      );

    case "payroll":
      return (
        <Panel border="border-emerald-200" gradient="from-emerald-50/80">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Preview before saving</h3>
            <DocsCodeBlock
              code={`POST ${base}/api/payroll/preview
Content-Type: application/json

{
  "employeeId": "emp_001",
  "periodStart": "2026-08-01",
  "periodEnd": "2026-08-31",
  "baseSalary": 5000,
  "bonus": 200
}

→ { "items": [...], "summary": { "gross", "deductions", "net" } }`}
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Payroll settings</h3>
            <DocsCodeBlock
              code={`PATCH ${base}/api/payroll/settings
Content-Type: application/json

{
  "taxRatePercent": 15,
  "latenessDeductionPerDay": 50,
  "holidayAllowanceEnabled": true,
  "holidayAllowanceAmount": 100
}`}
            />
          </div>
          <p className="text-xs text-gray-500">
            Payslip download returns HTML attachment at GET /api/payroll/:id/payslip. SSE:{" "}
            <code className="bg-gray-100 px-1 rounded">payroll_updated</code>
          </p>
          <Link href="/payroll" className="inline-flex text-xs font-medium text-brand-600 hover:text-brand-700">
            Open payroll →
          </Link>
        </Panel>
      );

    case "recruitment":
      return (
        <Panel border="border-blue-200" gradient="from-blue-50/80">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Hire → onboard flow</h3>
            <p className="text-sm text-gray-500 mb-3">
              Moving a candidate to <strong>Hired</strong> auto-provisions an employee account (default password{" "}
              <code className="text-xs bg-gray-100 px-1 rounded">password</code>), sends welcome email, and logs onboarding
              activity.
            </p>
            <DocsCodeBlock
              code={`PATCH ${base}/api/applications/{id}
Content-Type: application/json

{
  "pipelineStage": "Hired",
  "reason": "Offer accepted"
}

# Also: POST jobs, POST applications, POST interviews`}
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Recruitment settings</h3>
            <DocsCodeBlock
              code={`POST ${base}/api/recruitment/settings
Content-Type: application/json

{ "type": "stage", "name": "Final Interview", "sortOrder": 4 }

# type: stage | tag | source | template
DELETE ${base}/api/recruitment/settings?type=stage&id=…`}
            />
          </div>
          <Link href="/recruitment" className="inline-flex text-xs font-medium text-brand-600 hover:text-brand-700">
            Open recruitment →
          </Link>
        </Panel>
      );

    case "performance":
      return (
        <Panel border="border-orange-200" gradient="from-orange-50/80">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Appraisal cycle workflow</h3>
            <DocsCodeBlock
              code={`# 1. Create KPI library
POST ${base}/api/performance/kpis
{ "title": "Sales quota", "targetValue": 100, "weight": 30 }

# 2. Start cycle (optionally includeAllEmployees)
POST ${base}/api/performance/cycles
{ "name": "H1 2026", "period": "H1", "startDate": "…", "endDate": "…", "kpiIds": ["…"] }

# 3. Employee self-review, then manager review
PATCH ${base}/api/performance/appraisals/{id}
{ "section": "self", "selfRating": 4, "submit": true }`}
            />
          </div>
          <Link href="/performance" className="inline-flex text-xs font-medium text-brand-600 hover:text-brand-700">
            Open performance →
          </Link>
        </Panel>
      );

    case "organization":
      return (
        <Panel border="border-teal-200" gradient="from-teal-50/80">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Company scoping</h3>
            <p className="text-sm text-gray-500 mb-3">
              Departments, holidays, and announcements filter by session companyId. Documents use employee-level visibility.
            </p>
            <DocsCodeBlock
              code={`GET ${base}/api/departments
GET ${base}/api/holidays
GET ${base}/api/announcements
GET ${base}/api/documents`}
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Department delete rule</h3>
            <DocsCodeBlock
              code={`DELETE ${base}/api/departments/{id}
→ 400 { "error": "Cannot delete a department with employees" }`}
            />
          </div>
          <p className="text-xs text-gray-500">
            SSE: department_updated, holiday_updated, announcement_created, document_updated
          </p>
        </Panel>
      );

    case "integrations":
      return (
        <Panel border="border-violet-200" gradient="from-violet-50/80">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Provider slugs</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                    <th className="px-4 py-2">Slug</th>
                    <th className="px-4 py-2">Provider</th>
                    <th className="px-4 py-2">Sync</th>
                    <th className="px-4 py-2">Webhook</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {[
                    ["google-workspace", "Google Workspace", "Calendar, holidays", "/api/webhooks/google"],
                    ["zoho-people", "Zoho People", "Employees (≤50)", "/api/webhooks/zoho/people"],
                    ["zoho-recruit", "Zoho Recruit", "Jobs (≤20)", "/api/webhooks/zoho/recruit"],
                    ["zoho-books", "Zoho Books", "Payroll contacts", "/api/webhooks/zoho/books"],
                    ["zoho-sign", "Zoho Sign", "E-sign docs", "/api/webhooks/zoho/sign"],
                    ["zoho-mail", "Zoho Mail", "Announcement emails", "/api/webhooks/zoho/mail"],
                  ].map(([slug, name, sync, webhook]) => (
                    <tr key={slug}>
                      <td className="px-4 py-2 font-mono text-brand-700">{slug}</td>
                      <td className="px-4 py-2">{name}</td>
                      <td className="px-4 py-2 text-gray-500">{sync}</td>
                      <td className="px-4 py-2 font-mono text-gray-600">{webhook}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DocsCodeBlock
            code={`# OAuth connect
GET ${base}/api/integrations/google-workspace/connect
→ 302 → callback → /settings/integrations?connected=google-workspace

# Manual sync
POST ${base}/api/integrations/zoho-people/sync
→ { "success": true, "synced": 12, "summary": "…" }

# Cron (all tenants)
POST ${base}/api/integrations/cron
x-cron-secret: your-secret`}
          />
          <DocsCodeBlock
            code={`# Environment variables
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=${base}/api/google/callback
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REDIRECT_URI=${base}/api/integrations/zoho/callback
ZOHO_CLIENT_SECRET=
INTEGRATION_CRON_SECRET=
APP_URL=${base}`}
          />
          <p className="text-xs text-gray-500">
            SSE: integration_sync, integration_updated, employee_updated (after Zoho People sync)
          </p>
          <Link href="/settings/integrations" className="inline-flex text-xs font-medium text-brand-600 hover:text-brand-700">
            Open integrations settings →
          </Link>
        </Panel>
      );

    case "notifications":
      return (
        <Panel border="border-pink-200" gradient="from-pink-50/80">
          <DocsCodeBlock
            code={`GET ${base}/api/notifications
→ { "items": [...], "unread": 3 }

PATCH ${base}/api/notifications/{id}
→ mark one read

PATCH ${base}/api/notifications
{ "all": true }
→ mark all read

# SSE: notification_updated`}
          />
        </Panel>
      );

    case "admin":
      return (
        <Panel border="border-slate-200" gradient="from-slate-50/80">
          <DocsCodeBlock
            code={`GET ${base}/api/subscription
→ { planId, planName, status, maxEmployees, employeeCount, trialEndsAt, canAddEmployees }

PATCH ${base}/api/subscription
{ "planId": "pro", "billingEmail": "billing@company.com" }

# Super admin only:
PATCH ${base}/api/admin/companies/{id}
{ "planId": "pro", "subscriptionStatus": "ACTIVE", "isActive": true }`}
          />
          <Link href="/settings/subscription" className="inline-flex text-xs font-medium text-brand-600 hover:text-brand-700">
            Open subscription settings →
          </Link>
        </Panel>
      );

    case "webhooks":
      return (
        <Panel border="border-gray-300" gradient="from-gray-50/80">
          <DocsCodeBlock
            code={`# Google Calendar push
POST ${base}/api/webhooks/google
x-goog-channel-token: {integration.webhookSecret}

# Zoho inbound
POST ${base}/api/webhooks/zoho/people
x-zoho-webhook-signature: {integration.webhookSecret}

{ "event": "employee.updated", "recordId": "12345" }

→ triggers sync + SSE (employee_updated, integration_webhook, …)`}
          />
        </Panel>
      );

    case "utility":
      return (
        <Panel border="border-cyan-200" gradient="from-cyan-50/80">
          <DocsCodeBlock
            code={`GET ${base}/api/search?q=alex
→ { employees[], documents[], jobs[], announcements[], holidays[] }

PATCH ${base}/api/settings/profile
{ "phone": "+1…", "address": "…", "preferences": { "emailDigest": true } }

GET ${base}/api/dashboard/export?type=employees
GET ${base}/api/dashboard/export?type=attendance&date=2026-08-01
GET ${base}/api/dashboard/export?type=dashboard&range=month
→ CSV download`}
          />
        </Panel>
      );

    default:
      return null;
  }
}
