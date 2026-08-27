import { google } from "googleapis";
import type { IntegrationProvider } from "@/lib/integrations/types";
import { getCatalogItem } from "@/lib/integrations/catalog";
import { getGoogleRedirectUri } from "@/lib/integrations/oauth-env";
import {
  getIntegration,
  upsertIntegration,
  disconnectIntegration,
  parseMetadata,
} from "@/lib/integrations/store";

export { getGoogleRedirectUri } from "@/lib/integrations/oauth-env";

const PROVIDER: IntegrationProvider = "GOOGLE_WORKSPACE";

export function isGoogleWorkspaceConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function createGoogleOAuthClient(_appUrl?: string) {
  if (!isGoogleWorkspaceConfigured()) return null;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getGoogleRedirectUri()
  );
}

export function getGoogleAuthUrl(state: string, _appUrl?: string) {
  const client = createGoogleOAuthClient();
  if (!client) return null;
  const scopes = getCatalogItem(PROVIDER)?.scopes ?? [];
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
    state,
    redirect_uri: getGoogleRedirectUri(),
  });
}

export async function exchangeGoogleCode(
  code: string,
  companyId?: string | null,
  _appUrl?: string
) {
  const client = createGoogleOAuthClient();
  if (!client) throw new Error("Google OAuth is not configured");

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const profile = await oauth2.userinfo.get();

  return upsertIntegration(PROVIDER, companyId, {
    status: "CONNECTED",
    accessToken: tokens.access_token ?? null,
    refreshToken: tokens.refresh_token ?? null,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    accountEmail: profile.data.email ?? null,
    accountId: profile.data.id ?? null,
    scopes: JSON.stringify(getCatalogItem(PROVIDER)?.scopes ?? []),
    metadata: JSON.stringify({ calendarId: "primary" }),
    connectedAt: new Date(),
    lastError: null,
  });
}

export async function getGoogleAuthorizedClient(companyId?: string | null) {
  const client = createGoogleOAuthClient();
  if (!client) return null;

  const integration = await getIntegration(PROVIDER, companyId);
  if (!integration?.refreshToken && !integration?.accessToken) return null;

  client.setCredentials({
    access_token: integration.accessToken ?? undefined,
    refresh_token: integration.refreshToken ?? undefined,
    expiry_date: integration.expiryDate?.getTime(),
  });

  client.on("tokens", async (tokens) => {
    await upsertIntegration(PROVIDER, companyId, {
      accessToken: tokens.access_token ?? integration.accessToken,
      refreshToken: tokens.refresh_token ?? integration.refreshToken,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : integration.expiryDate,
      accountEmail: integration.accountEmail,
    });
  });

  return client;
}

export async function getGoogleCalendarId(companyId?: string | null) {
  const integration = await getIntegration(PROVIDER, companyId);
  const meta = parseMetadata(integration);
  return (meta.calendarId as string) || "primary";
}

export async function disconnectGoogleWorkspace(companyId?: string | null) {
  return disconnectIntegration(PROVIDER, companyId);
}

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

export async function createCalendarEventWithMeet(
  input: CalendarEventInput,
  companyId?: string | null
): Promise<CalendarEventResult> {
  const auth = await getGoogleAuthorizedClient(companyId);
  if (!auth) throw new Error("GOOGLE_NOT_CONNECTED");

  const calendarId = await getGoogleCalendarId(companyId);
  const calendar = google.calendar({ version: "v3", auth });
  const requestId = `smarthr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const response = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: input.summary,
      description: input.description,
      location: input.location,
      start: { dateTime: input.start.toISOString() },
      end: { dateTime: input.end.toISOString() },
      attendees: input.attendeeEmails.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const meetLink =
    response.data.hangoutLink ||
    response.data.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video"
    )?.uri ||
    null;

  return {
    eventId: response.data.id || requestId,
    meetLink,
    htmlLink: response.data.htmlLink || null,
  };
}

export async function updateCalendarEvent(
  eventId: string,
  input: Partial<CalendarEventInput>,
  companyId?: string | null
) {
  const auth = await getGoogleAuthorizedClient(companyId);
  if (!auth) throw new Error("GOOGLE_NOT_CONNECTED");

  const calendarId = await getGoogleCalendarId(companyId);
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.events.patch({
    calendarId,
    eventId,
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      ...(input.summary && { summary: input.summary }),
      ...(input.description && { description: input.description }),
      ...(input.location && { location: input.location }),
      ...(input.start &&
        input.end && {
          start: { dateTime: input.start.toISOString() },
          end: { dateTime: input.end.toISOString() },
        }),
      ...(input.attendeeEmails && {
        attendees: input.attendeeEmails.map((email) => ({ email })),
      }),
    },
  });

  const meetLink =
    response.data.hangoutLink ||
    response.data.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video"
    )?.uri ||
    null;

  return {
    eventId: response.data.id || eventId,
    meetLink,
    htmlLink: response.data.htmlLink || null,
  };
}

export async function cancelCalendarEvent(eventId: string, companyId?: string | null) {
  const auth = await getGoogleAuthorizedClient(companyId);
  if (!auth) return;

  const calendarId = await getGoogleCalendarId(companyId);
  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.delete({
    calendarId,
    eventId,
    sendUpdates: "all",
  });
}
