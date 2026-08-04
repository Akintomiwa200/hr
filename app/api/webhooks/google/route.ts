import { NextRequest, NextResponse } from "next/server";
import { handleGoogleWebhook } from "@/lib/integrations/sync";
import { getIntegration } from "@/lib/integrations/store";

export async function POST(request: NextRequest) {
  const channelToken = request.headers.get("x-goog-channel-token");
  const integration = await getIntegration("GOOGLE_WORKSPACE", null);

  if (integration?.webhookSecret && channelToken !== integration.webhookSecret) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text) payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    payload = {
      resourceState: request.headers.get("x-goog-resource-state"),
      resourceId: request.headers.get("x-goog-resource-id"),
      channelId: request.headers.get("x-goog-channel-id"),
    };
  }

  const result = await handleGoogleWebhook(payload);
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
