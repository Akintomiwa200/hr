import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/constants/auth";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function createOAuthClient() {
  if (!isGoogleConfigured()) return null;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${getAppUrl()}/api/google/callback`
  );
}

export async function getGoogleIntegration() {
  return prisma.googleIntegration.findUnique({ where: { id: "default" } });
}

export async function ensureGoogleIntegrationRow() {
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
  await ensureGoogleIntegrationRow();
  return prisma.googleIntegration.update({
    where: { id: "default" },
    data: {
      accessToken: tokens.access_token ?? undefined,
      refreshToken: tokens.refresh_token ?? undefined,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      email: tokens.email ?? undefined,
      connectedAt: new Date(),
    },
  });
}

export async function getAuthorizedClient() {
  const oauth2Client = createOAuthClient();
  if (!oauth2Client) return null;

  const integration = await getGoogleIntegration();
  if (!integration?.refreshToken && !integration?.accessToken) return null;

  oauth2Client.setCredentials({
    access_token: integration.accessToken ?? undefined,
    refresh_token: integration.refreshToken ?? undefined,
    expiry_date: integration.expiryDate?.getTime(),
  });

  oauth2Client.on("tokens", async (tokens) => {
    await saveGoogleTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      email: integration.email,
    });
  });

  return oauth2Client;
}

export function getGoogleAuthUrl() {
  const oauth2Client = createOAuthClient();
  if (!oauth2Client) return null;
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export async function exchangeGoogleCode(code: string) {
  const oauth2Client = createOAuthClient();
  if (!oauth2Client) throw new Error("Google OAuth is not configured");

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const profile = await oauth2.userinfo.get();

  await saveGoogleTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    email: profile.data.email,
  });

  return profile.data.email;
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
  input: CalendarEventInput
): Promise<CalendarEventResult> {
  const auth = await getAuthorizedClient();
  if (!auth) {
    throw new Error("GOOGLE_NOT_CONNECTED");
  }

  const integration = await getGoogleIntegration();
  const calendar = google.calendar({ version: "v3", auth });
  const requestId = `smarthr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const response = await calendar.events.insert({
    calendarId: integration?.calendarId || "primary",
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
  input: Partial<CalendarEventInput>
) {
  const auth = await getAuthorizedClient();
  if (!auth) throw new Error("GOOGLE_NOT_CONNECTED");

  const integration = await getGoogleIntegration();
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.events.patch({
    calendarId: integration?.calendarId || "primary",
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

export async function cancelCalendarEvent(eventId: string) {
  const auth = await getAuthorizedClient();
  if (!auth) return;

  const integration = await getGoogleIntegration();
  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.delete({
    calendarId: integration?.calendarId || "primary",
    eventId,
    sendUpdates: "all",
  });
}

export async function disconnectGoogleIntegration() {
  await ensureGoogleIntegrationRow();
  return prisma.googleIntegration.update({
    where: { id: "default" },
    data: {
      accessToken: null,
      refreshToken: null,
      expiryDate: null,
      email: null,
      connectedAt: null,
    },
  });
}
