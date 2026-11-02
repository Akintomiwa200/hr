import { createHmac, timingSafeEqual } from "crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAndBroadcast } from "@/lib/integrations/broadcast";
import { runIntegrationSync } from "@/lib/integrations/sync";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function POST(request: NextRequest) {
  const verifierToken = process.env.INTUIT_WEBHOOK_VERIFIER_TOKEN;
  if (!verifierToken) return NextResponse.json({ error: "QuickBooks webhook verifier is not configured" }, { status: 503 });
  const body = await request.text();
  const supplied = request.headers.get("intuit-signature") ?? "";
  const expected = createHmac("sha256", verifierToken).update(body).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (!supplied || expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
    return NextResponse.json({ error: "Invalid Intuit webhook signature" }, { status: 401 });
  }
  const payload = JSON.parse(body) as { eventNotifications?: Array<{ realmId?: string; dataChangeEvent?: { entities?: Array<{ name?: string; operation?: string; id?: string }> } }> };
  const notifications = payload.eventNotifications ?? [];
  const integrations = await Promise.all(notifications.map((n) => n.realmId
    ? prisma.integration.findFirst({ where: { provider: "QUICKBOOKS", accountId: n.realmId, status: { not: "DISCONNECTED" } } })
    : null));
  after(async () => {
    for (let i = 0; i < notifications.length; i++) {
      const integration = integrations[i];
      if (!integration) continue;
      const entities = notifications[i].dataChangeEvent?.entities ?? [];
      const summary = `QuickBooks changed ${entities.map((entity) => `${entity.name ?? "resource"} ${entity.operation ?? "updated"}`).join(", ") || "accounting data"}`;
      await recordAndBroadcast(integration.id, "QUICKBOOKS", {
        direction: "inbound", eventType: "quickbooks_change", summary,
        payload: { entities: entities.map(({ name, operation, id }) => ({ name, operation, id })) },
        broadcastType: "webhook",
      }).catch(() => undefined);
      broadcastAppEvent("payroll_updated", { companyId: integration.companyId, source: "quickbooks_webhook" });
      await runIntegrationSync("QUICKBOOKS", integration.companyId).catch(() => undefined);
    }
  });
  return NextResponse.json({ received: true }, { status: 200 });
}
