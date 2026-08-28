import { NextResponse } from "next/server";
import { requireSession, unauthorized } from "@/lib/api-auth";
import { getAttendanceOverview } from "@/lib/attendance-overview";
import { withPrismaRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  try {
    const overview = await withPrismaRetry(() => getAttendanceOverview(session));
    return NextResponse.json(overview);
  } catch (error) {
    console.error("[attendance/overview]", error);
    return NextResponse.json(
      { error: "Database connection failed. Refresh in a moment." },
      { status: 503 }
    );
  }
}
