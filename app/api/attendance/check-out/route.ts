import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recordCheckOut } from "@/lib/attendance-service";

export async function POST() {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recordCheckOut({
      employeeId: session.employeeId,
      method: "WEB",
    });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Check-out failed";
    const status = message === "NO_CHECK_IN" ? 400 : 400;
    return NextResponse.json(
      {
        error:
          message === "NO_CHECK_IN"
            ? "No check-in found for today"
            : message,
      },
      { status }
    );
  }
}
