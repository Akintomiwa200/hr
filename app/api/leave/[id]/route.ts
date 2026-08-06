import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession, canApproveLeave } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { createNotification } from "@/lib/notifications";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !canApproveLeave(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { action } = await request.json();

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const leave = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      approverId: session.employeeId,
    },
    include: { employee: { include: { user: true } } },
  });

  await createNotification({
    userId: leave.employee.userId,
    type: "leave",
    title: `Leave ${action === "approve" ? "approved" : "rejected"}`,
    message: `Your ${leave.type.toLowerCase()} leave request was ${action === "approve" ? "approved" : "rejected"}`,
    href: "/leave",
  });

  broadcastAppEvent("leave_updated", { id, action });
  revalidatePath("/leave");
  revalidatePath("/dashboard");

  return NextResponse.json({ success: true });
}
