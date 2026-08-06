import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { notifyCompanyUsers } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, startDate, endDate, reason } = await request.json();

  if (!type || !startDate || !endDate || !reason) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      employeeId: session.employeeId,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
    },
  });

  if (session.companyId) {
    await notifyCompanyUsers(
      session.companyId,
      {
        type: "leave",
        title: "Leave approval needed",
        message: `${session.firstName ?? "An employee"} requested ${type.toLowerCase()} leave`,
        href: "/leave",
      },
      { roles: ["HR", "MANAGER", "COMPANY_ADMIN", "SUPERVISOR"] }
    );
  }

  broadcastAppEvent("leave_updated", { id: leave.id, action: "created" });
  revalidatePath("/leave");
  revalidatePath("/dashboard");

  return NextResponse.json({ success: true });
}
