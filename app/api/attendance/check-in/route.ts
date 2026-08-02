import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  recordCheckIn,
  recordCheckOut,
} from "@/lib/attendance-service";

export async function POST() {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recordCheckIn({
      employeeId: session.employeeId,
      method: "WEB",
    });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Check-in failed" },
      { status: 400 }
    );
  }
}
