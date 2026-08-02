import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import {
  disconnectGoogleIntegration,
  getGoogleAuthUrl,
  getGoogleIntegration,
  isGoogleConfigured,
} from "@/lib/google-calendar";
import { isHr, requireSession, unauthorized } from "@/lib/api-auth";

export async function GET() {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const integration = await getGoogleIntegration();
  return NextResponse.json({
    configured: isGoogleConfigured(),
    connected: Boolean(integration?.refreshToken),
    email: integration?.email ?? null,
    connectedAt: integration?.connectedAt ?? null,
    calendarId: integration?.calendarId ?? "primary",
  });
}

export async function DELETE() {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  await disconnectGoogleIntegration();
  return NextResponse.json({ success: true });
}
