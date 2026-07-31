import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/events";

export async function POST() {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: session.employeeId,
        date: today,
      },
    },
  });

  if (!record) {
    return NextResponse.json({ error: "No check-in found" }, { status: 400 });
  }

  await prisma.attendance.update({
    where: { id: record.id },
    data: { checkOut: new Date() },
  });

  broadcastEvent("attendance_updated", { employeeId: session.employeeId });
  revalidatePath("/attendance");
  revalidatePath("/dashboard");

  return NextResponse.json({ success: true });
}
