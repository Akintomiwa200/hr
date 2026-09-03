import { NextResponse } from "next/server";
import { runBirthdayCelebrationsForAllCompanies } from "@/lib/birthdays";

/**
 * External cron trigger for daily birthday celebrations.
 * Protected by a shared secret so it can't be invoked by anonymous clients.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.INTEGRATION_CRON_SECRET;

  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runBirthdayCelebrationsForAllCompanies();
  return NextResponse.json({ success: true, at: new Date().toISOString(), summary });
}