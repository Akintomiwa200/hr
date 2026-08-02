import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/events";
import { badRequest, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageOrgContent } from "@/lib/roles";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageOrgContent(session.role)) return unauthorized();

  const { id } = await params;
  const { title, content, priority } = await request.json();

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) return notFound();

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(priority !== undefined && { priority }),
    },
  });

  broadcastEvent("announcement_created", { id });
  revalidatePath("/announcements");
  return NextResponse.json(announcement);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageOrgContent(session.role)) return unauthorized();

  const { id } = await params;
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) return notFound();

  await prisma.announcement.delete({ where: { id } });
  broadcastEvent("announcement_created", { id });
  revalidatePath("/announcements");
  return NextResponse.json({ success: true });
}
