import { createHmac, timingSafeEqual } from "crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { getIntegration, parseMetadata } from "@/lib/integrations/store";
import { runIntegrationSync } from "@/lib/integrations/sync";

export async function POST(request: NextRequest) {
  const companyQuery = request.nextUrl.searchParams.get("companyId");
  const companyId = companyQuery && companyQuery !== "platform" ? companyQuery : null;
  const integration = await getIntegration("BAMBOOHR", companyId);
  if (integration?.status === "DISCONNECTED") return NextResponse.json({ ok: true });
  const privateKey = parseMetadata(integration).webhookPrivateKey;
  if (!integration || typeof privateKey !== "string" || !privateKey) {
    return NextResponse.json({ error: "BambooHR webhook is not configured" }, { status: 404 });
  }

  const rawBody = await request.text();
  const timestamp = request.headers.get("x-bamboohr-timestamp") ?? "";
  const signature = request.headers.get("x-bamboohr-signature") ?? "";
  const timestampMs = Date.parse(timestamp);
  if (!timestamp || !signature || !Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 10 * 60 * 1000) {
    return NextResponse.json({ error: "Invalid webhook timestamp" }, { status: 401 });
  }
  const expected = createHmac("sha256", privateKey).update(`${rawBody}${timestamp}`).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return NextResponse.json({ error: "Invalid BambooHR webhook signature" }, { status: 401 });
  }

  after(async () => {
    await runIntegrationSync("BAMBOOHR", companyId).catch(() => undefined);
  });
  return NextResponse.json({ ok: true }, { status: 202 });
}
