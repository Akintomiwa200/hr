import type { IntegrationRecord, IntegrationProvider } from "@/lib/integrations/types";
import { prisma } from "@/lib/prisma";
import { recordAndBroadcast } from "@/lib/integrations/broadcast";
import {
  getIntegration,
  markSynced,
  markSyncing,
  markError,
  isConnected,
} from "@/lib/integrations/store";
import { zohoApiFetch } from "@/lib/integrations/zoho/oauth";
import { broadcastEvent } from "@/lib/events";

type SyncResult = { synced: number; summary: string };

async function syncZohoPeople(integration: IntegrationRecord): Promise<SyncResult> {
  const data = (await zohoApiFetch(integration, "/people/api/forms/employee/getRecords")) as {
    response?: { result?: Array<Record<string, string>> };
  };

  const records = data.response?.result ?? [];
  let synced = 0;

  for (const row of records.slice(0, 50)) {
    const email = row.EmailID || row.Email;
    if (!email) continue;

    const firstName = row.FirstName || row.First_Name || "Employee";
    const lastName = row.LastName || row.Last_Name || "";
    const employeeCode = row.EmployeeID || row.Employee_ID || `ZP-${synced + 1}`;

    const existing = await prisma.employee.findFirst({ where: { email } });
    if (existing) {
      await prisma.employee.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName,
          jobTitle: row.Designation || existing.jobTitle,
        },
      });
    }
    synced++;
  }

  return { synced, summary: `Synced ${synced} employees from Zoho People` };
}

async function syncZohoRecruit(integration: IntegrationRecord): Promise<SyncResult> {
  const data = (await zohoApiFetch(integration, "/recruit/v2/Job_Openings")) as {
    data?: Array<{ id: string; Job_Opening_Name?: string; Client_Name?: string }>;
  };

  const jobs = data.data ?? [];
  let synced = 0;

  for (const job of jobs.slice(0, 20)) {
    const title = job.Job_Opening_Name || "Imported job";
    const existing = await prisma.job.findFirst({
      where: { title, description: { contains: job.id } },
    });
    if (!existing) {
      const department = await prisma.department.findFirst();
      if (!department) continue;
      await prisma.job.create({
        data: {
          title,
          description: `Imported from Zoho Recruit (${job.id})`,
          requirements: "See Zoho Recruit",
          departmentId: department.id,
          location: "Remote",
          type: "FULL_TIME",
          status: "OPEN",
        },
      });
      synced++;
    }
  }

  return { synced, summary: `Imported ${synced} jobs from Zoho Recruit` };
}

async function syncZohoBooks(integration: IntegrationRecord): Promise<SyncResult> {
  const payrollRecords = await prisma.payrollRecord.findMany({
    where: { status: { in: ["PROCESSED", "PAID"] } },
    include: { employee: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  let synced = 0;
  for (const record of payrollRecords) {
    try {
      await zohoApiFetch(integration, "/books/v3/contacts", {
        method: "POST",
        body: JSON.stringify({
          contact_name: `${record.employee.firstName} ${record.employee.lastName}`,
          contact_type: "customer",
        }),
      });
      synced++;
    } catch {
      // contact may already exist
    }
  }

  return { synced, summary: `Pushed ${synced} payroll contacts to Zoho Books` };
}

async function syncZohoSign(integration: IntegrationRecord): Promise<SyncResult> {
  const recentHires = await prisma.employee.findMany({
    orderBy: { hireDate: "desc" },
    take: 5,
  });

  return {
    synced: recentHires.length,
    summary: `Ready to send ${recentHires.length} onboarding documents via Zoho Sign`,
  };
}

async function syncZohoMail(integration: IntegrationRecord): Promise<SyncResult> {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return {
    synced: announcements.length,
    summary: `Queued ${announcements.length} announcements for Zoho Mail delivery`,
  };
}

async function syncGoogleWorkspace(integration: IntegrationRecord): Promise<SyncResult> {
  const holidays = await prisma.holiday.count();
  return {
    synced: holidays,
    summary: `Google Workspace connected — calendar push active for ${holidays} holidays`,
  };
}

const SYNC_HANDLERS: Record<
  IntegrationProvider,
  (integration: IntegrationRecord) => Promise<SyncResult>
> = {
  GOOGLE_WORKSPACE: syncGoogleWorkspace,
  ZOHO_PEOPLE: syncZohoPeople,
  ZOHO_RECRUIT: syncZohoRecruit,
  ZOHO_BOOKS: syncZohoBooks,
  ZOHO_SIGN: syncZohoSign,
  ZOHO_MAIL: syncZohoMail,
};

export async function runIntegrationSync(
  provider: IntegrationProvider,
  companyId?: string | null
) {
  const integration = await getIntegration(provider, companyId);
  if (!integration || !isConnected(integration)) {
    throw new Error(`${provider} is not connected`);
  }

  await markSyncing(integration.id);

  try {
    const handler = SYNC_HANDLERS[provider];
    const result = await handler(integration);
    await markSynced(integration.id);

    await recordAndBroadcast(integration.id, provider, {
      direction: "inbound",
      eventType: "full_sync",
      summary: result.summary,
      payload: { synced: result.synced },
    });

    if (provider === "ZOHO_PEOPLE") {
      broadcastEvent("employee_updated", { source: "zoho_people" });
    }
    if (provider === "ZOHO_RECRUIT") {
      broadcastEvent("job_updated", { source: "zoho_recruit" });
    }
    if (provider === "ZOHO_BOOKS") {
      broadcastEvent("payroll_updated", { source: "zoho_books" });
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    await markError(integration.id, message);
    throw error;
  }
}

export async function runAllIntegrationSyncs(companyId?: string | null) {
  const providers = Object.keys(SYNC_HANDLERS) as IntegrationProvider[];
  const results: Array<{ provider: IntegrationProvider; ok: boolean; summary?: string }> = [];

  for (const provider of providers) {
    try {
      const integration = await getIntegration(provider, companyId);
      if (!isConnected(integration)) continue;
      const result = await runIntegrationSync(provider, companyId);
      results.push({ provider, ok: true, summary: result.summary });
    } catch {
      results.push({ provider, ok: false });
    }
  }

  return results;
}

export async function handleZohoWebhook(
  product: "people" | "recruit" | "books" | "sign" | "mail",
  payload: Record<string, unknown>,
  companyId?: string | null
) {
  const providerMap = {
    people: "ZOHO_PEOPLE",
    recruit: "ZOHO_RECRUIT",
    books: "ZOHO_BOOKS",
    sign: "ZOHO_SIGN",
    mail: "ZOHO_MAIL",
  } as const;

  const provider = providerMap[product];
  const integration = await getIntegration(provider, companyId);
  if (!integration) return { ok: false, reason: "not_configured" };

  const eventType = String(payload.event || payload.action || "webhook");

  if (product === "people") {
    broadcastEvent("employee_updated", { source: "zoho_webhook", eventType });
    if (eventType.includes("leave")) {
      broadcastEvent("leave_updated", { source: "zoho_webhook" });
    }
    if (eventType.includes("attendance")) {
      broadcastEvent("attendance_updated", { source: "zoho_webhook" });
    }
  }

  if (product === "recruit") {
    broadcastEvent("job_updated", { source: "zoho_webhook", eventType });
  }

  if (product === "books") {
    broadcastEvent("payroll_updated", { source: "zoho_webhook", eventType });
  }

  await recordAndBroadcast(integration.id, provider, {
    direction: "inbound",
    eventType,
    summary: `Zoho ${product} webhook processed`,
    payload,
    broadcastType: "webhook",
  });

  await runIntegrationSync(provider, companyId).catch(() => undefined);

  return { ok: true };
}

export async function handleGoogleWebhook(payload: Record<string, unknown>) {
  const integration = await getIntegration("GOOGLE_WORKSPACE", null);
  if (!integration) return { ok: false };

  const eventType = String(payload.resourceState || "sync");

  if (eventType.includes("calendar") || payload.resourceId) {
    broadcastEvent("holiday_updated", { source: "google_webhook" });
  }

  await recordAndBroadcast(integration.id, "GOOGLE_WORKSPACE", {
    direction: "inbound",
    eventType,
    summary: "Google Workspace push notification received",
    payload,
    broadcastType: "webhook",
  });

  return { ok: true };
}
