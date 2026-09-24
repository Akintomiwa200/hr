import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageOrgContent } from "@/lib/roles";
import { audit } from "@/lib/audit";

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

  broadcastAppEvent("announcement_created", { id });
  await audit({
    actor: session,
    module: "announcements",
    action: "UPDATE",
    entityId: id,
    entityLabel: existing.title,
  });
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
  await audit({
    actor: session,
    module: "announcements",
    action: "DELETE",
    entityId: id,
    entityLabel: existing.title,
  });
  broadcastAppEvent("announcement_created", { id });
  revalidatePath("/announcements");
  return NextResponse.json({ success: true });
}
