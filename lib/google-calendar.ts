import { prisma } from "@/lib/prisma";
import {
  isGoogleWorkspaceConfigured,
  getGoogleAuthorizedClient,
  getGoogleCalendarId,
  createCalendarEventWithMeet as createWorkspaceEvent,
  updateCalendarEvent as updateWorkspaceEvent,
  cancelCalendarEvent as cancelWorkspaceEvent,
  disconnectGoogleWorkspace,
  getGoogleAuthUrl as getWorkspaceAuthUrl,
  exchangeGoogleCode as exchangeWorkspaceCode,
} from "@/lib/integrations/google/workspace";
import { getIntegration, upsertIntegration, parseMetadata } from "@/lib/integrations/store";

export type CalendarEventInput = {
  summary: string;
  description: string;
  start: Date;
  end: Date;
  attendeeEmails: string[];
  location?: string;
};

export type CalendarEventResult = {
  eventId: string;
  meetLink: string | null;
  htmlLink: string | null;
};

export function isGoogleConfigured() {
  return isGoogleWorkspaceConfigured();
}

export function createOAuthClient() {
  return null;
}

async function migrateLegacyGoogleIntegration() {
  const legacy = await prisma.googleIntegration.findUnique({ where: { id: "default" } });
  if (!legacy?.refreshToken && !legacy?.accessToken) return null;

  return upsertIntegration("GOOGLE_WORKSPACE", null, {
    status: "CONNECTED",
    accessToken: legacy.accessToken,
    refreshToken: legacy.refreshToken,
    expiryDate: legacy.expiryDate,
    accountEmail: legacy.email,
    metadata: JSON.stringify({ calendarId: legacy.calendarId || "primary" }),
    connectedAt: legacy.connectedAt ?? new Date(),
  });
}

export async function getGoogleIntegration() {
  let integration = await getIntegration("GOOGLE_WORKSPACE", null);
  if (!integration?.refreshToken) {
    integration = (await migrateLegacyGoogleIntegration()) ?? integration;
  }

  if (!integration) return null;

  const meta = parseMetadata(integration);
  return {
    id: integration.id,
    accessToken: integration.accessToken,
    refreshToken: integration.refreshToken,
    expiryDate: integration.expiryDate,
    email: integration.accountEmail,
    calendarId: (meta.calendarId as string) || "primary",
    connectedAt: integration.connectedAt,
    updatedAt: integration.updatedAt,
  };
}

export async function ensureGoogleIntegrationRow() {
  const row = await getGoogleIntegration();
  if (row) return row;
  return prisma.googleIntegration.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
}

export async function saveGoogleTokens(tokens: {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  email?: string | null;
}) {
  return upsertIntegration("GOOGLE_WORKSPACE", null, {
    status: "CONNECTED",
    accessToken: tokens.access_token ?? null,
    refreshToken: tokens.refresh_token ?? null,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    accountEmail: tokens.email ?? null,
    connectedAt: new Date(),
  });
}

export async function getAuthorizedClient() {
  await migrateLegacyGoogleIntegration();
  return getGoogleAuthorizedClient(null);
}

export function getGoogleAuthUrl() {
  return getWorkspaceAuthUrl("");
}

export async function exchangeGoogleCode(code: string) {
  const integration = await exchangeWorkspaceCode(code, null);
  return integration.accountEmail;
}

export async function createCalendarEventWithMeet(
  input: CalendarEventInput
): Promise<CalendarEventResult> {
  return createWorkspaceEvent(input, null);
}

export async function updateCalendarEvent(
  eventId: string,
  input: Partial<CalendarEventInput>
) {
  return updateWorkspaceEvent(eventId, input, null);
}

export async function cancelCalendarEvent(eventId: string) {
  return cancelWorkspaceEvent(eventId, null);
}

export async function disconnectGoogleIntegration() {
  return disconnectGoogleWorkspace(null);
}

export async function getGoogleCalendarIdLegacy() {
  return getGoogleCalendarId(null);
}
