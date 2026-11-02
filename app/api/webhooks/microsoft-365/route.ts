import { after, NextRequest, NextResponse } from "next/server";
import { getIntegration, parseMetadata } from "@/lib/integrations/store";
import { runIntegrationSync } from "@/lib/integrations/sync";

function companyFrom(request: NextRequest) {
  return request.nextUrl.searchParams.get("companyId") || null;
}

export async function GET(request: NextRequest) {
  const validationToken = request.nextUrl.searchParams.get("validationToken");
  if (!validationToken) return new NextResponse("Microsoft Graph webhook endpoint is active", { status: 200, headers: { "Content-Type": "text/plain" } });
  return new NextResponse(validationToken, { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(request: NextRequest) {
  const companyId = companyFrom(request);
  const integration = await getIntegration("MICROSOFT_365", companyId);
  const expectedClientState = parseMetadata(integration).subscriptionClientState;
  const payload = await request.json().catch(() => null) as { value?: Array<{ clientState?: string }> } | null;
  const notifications = payload?.value;
  if (!integration || typeof expectedClientState !== "string" || !Array.isArray(notifications) || notifications.length === 0 || notifications.some((item) => item.clientState !== expectedClientState)) {
    return NextResponse.json({ error: "Invalid Microsoft Graph notification" }, { status: 401 });
  }
  after(async () => {
    await runIntegrationSync("MICROSOFT_365", companyId).catch(() => undefined);
  });
  return NextResponse.json({ received: true }, { status: 202 });
}
