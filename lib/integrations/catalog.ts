import type { IntegrationProvider } from "@/lib/integrations/types";

export type IntegrationCatalogItem = {
  provider: IntegrationProvider;
  name: string;
  vendor: "Google" | "Zoho";
  description: string;
  modules: string[];
  scopes: string[];
  webhookPath?: string;
  docsUrl: string;
};

export const INTEGRATION_CATALOG: IntegrationCatalogItem[] = [
  {
    provider: "GOOGLE_WORKSPACE",
    name: "Google Workspace",
    vendor: "Google",
    description:
      "Calendar, Gmail, Directory, Drive, and Meet — sync interviews, users, documents, and notifications in real time.",
    modules: ["Calendar", "Gmail", "Directory", "Drive", "Meet"],
    scopes: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/admin.directory.user.readonly",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    webhookPath: "/api/webhooks/google",
    docsUrl: "https://developers.google.com/workspace",
  },
  {
    provider: "ZOHO_PEOPLE",
    name: "Zoho People",
    vendor: "Zoho",
    description:
      "Employees, departments, leave, and attendance — two-way sync with your HR master data.",
    modules: ["Employees", "Leave", "Attendance", "Departments"],
    scopes: [
      "ZOHOPEOPLE.forms.ALL",
      "ZOHOPEOPLE.employee.ALL",
      "ZOHOPEOPLE.leave.ALL",
      "ZOHOPEOPLE.attendance.ALL",
    ],
    webhookPath: "/api/webhooks/zoho/people",
    docsUrl: "https://www.zoho.com/people/api/",
  },
  {
    provider: "ZOHO_RECRUIT",
    name: "Zoho Recruit",
    vendor: "Zoho",
    description: "Jobs, candidates, and interviews synced with Smart HR recruitment.",
    modules: ["Jobs", "Candidates", "Interviews"],
    scopes: ["ZohoRecruit.modules.ALL", "ZohoRecruit.settings.ALL"],
    webhookPath: "/api/webhooks/zoho/recruit",
    docsUrl: "https://www.zoho.com/recruit/developer-guide/",
  },
  {
    provider: "ZOHO_BOOKS",
    name: "Zoho Books",
    vendor: "Zoho",
    description: "Payroll and finance — push processed payroll runs to Zoho Books automatically.",
    modules: ["Payroll export", "Invoices", "Contacts"],
    scopes: ["ZohoBooks.fullaccess.all"],
    webhookPath: "/api/webhooks/zoho/books",
    docsUrl: "https://www.zoho.com/books/api/v3/",
  },
  {
    provider: "ZOHO_SIGN",
    name: "Zoho Sign",
    vendor: "Zoho",
    description: "Send offer letters and onboarding documents for e-signature when hiring.",
    modules: ["Offer letters", "Onboarding docs", "Status tracking"],
    scopes: [
      "ZohoSign.documents.CREATE",
      "ZohoSign.documents.READ",
      "ZohoSign.documents.UPDATE",
      "ZohoSign.documents.DELETE",
    ],
    webhookPath: "/api/webhooks/zoho/sign",
    docsUrl: "https://www.zoho.com/sign/api/",
  },
  {
    provider: "ZOHO_MAIL",
    name: "Zoho Mail",
    vendor: "Zoho",
    description: "Transactional HR emails via your Zoho Mail organization.",
    modules: ["Leave alerts", "Payroll notices", "Announcements"],
    scopes: ["ZohoMail.accounts.READ", "ZohoMail.messages.CREATE", "ZohoMail.messages.READ"],
    webhookPath: "/api/webhooks/zoho/mail",
    docsUrl: "https://www.zoho.com/mail/help/api/",
  },
];

export function getCatalogItem(provider: IntegrationProvider) {
  return INTEGRATION_CATALOG.find((item) => item.provider === provider);
}

export const ALL_INTEGRATION_PROVIDERS = INTEGRATION_CATALOG.map((item) => item.provider);
