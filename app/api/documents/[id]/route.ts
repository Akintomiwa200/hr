import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/events";
import { isHr, notFound, requireSession, unauthorized } from "@/lib/api-auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const { id } = await params;
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return notFound();

  await prisma.document.delete({ where: { id } });
  broadcastEvent("document_updated", { id });
  revalidatePath("/documents");
  return NextResponse.json({ success: true });
}
