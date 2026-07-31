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

  const now = new Date();
  const isLate = now.getHours() >= 9 && now.getMinutes() > 15;

  await prisma.attendance.upsert({
    where: {
      employeeId_date: {
        employeeId: session.employeeId,
        date: today,
      },
    },
    create: {
      employeeId: session.employeeId,
      date: today,
      checkIn: now,
      status: isLate ? "LATE" : "PRESENT",
    },
    update: {
      checkIn: now,
      status: isLate ? "LATE" : "PRESENT",
    },
  });

  broadcastEvent("attendance_updated", { employeeId: session.employeeId });
  revalidatePath("/attendance");
  revalidatePath("/dashboard");

  return NextResponse.json({ success: true });
}
