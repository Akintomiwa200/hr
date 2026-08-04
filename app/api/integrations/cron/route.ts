import { NextResponse } from "next/server";
import { runAllIntegrationSyncs } from "@/lib/integrations/sync";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.INTEGRATION_CRON_SECRET;

  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runAllIntegrationSyncs(null);
  return NextResponse.json({ success: true, results, at: new Date().toISOString() });
}
