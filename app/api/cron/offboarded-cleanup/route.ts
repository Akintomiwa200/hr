import { NextResponse } from "next/server";
import { runGlobalOffboardedCleanup } from "@/lib/offboarding/cleanup";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.INTEGRATION_CRON_SECRET;

  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runGlobalOffboardedCleanup();
  return NextResponse.json({ success: true, ...result, at: new Date().toISOString() });
}
