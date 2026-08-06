import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { phone, address, preferences } = await request.json();

  if (session.employeeId) {
    await prisma.employee.update({
      where: { id: session.employeeId },
      data: {
        ...(phone !== undefined && { phone: phone || null }),
        ...(address !== undefined && { address: address || null }),
      },
    });
  }

  if (preferences !== undefined) {
    await prisma.user.update({
      where: { id: session.id },
      data: { preferences: JSON.stringify(preferences) },
    });
  }

  revalidatePath("/settings");
  broadcastAppEvent("settings_updated", { userId: session.id });
  return NextResponse.json({ success: true });
}
