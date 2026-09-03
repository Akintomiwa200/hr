import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma, isNoteModelReady } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canCreateSharedNotes } from "@/lib/notes/access";

async function loadNote(id: string) {
  return prisma.note.findUnique({ where: { id } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!isNoteModelReady()) {
    return NextResponse.json(
      { error: "Notes module is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const note = await loadNote(id);
  if (!note) return notFound();

  // Owner can always edit private notes; shared notes need org admin.
  const isOwner = note.userId === session.id;
  const isShared = note.scope === "SHARED";
  if (!isOwner && !(isShared && canCreateSharedNotes(session))) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  const data: Record<string, unknown> = {};

  if (typeof body?.title === "string") {
    const title = body.title.trim();
    data.title = title || "Untitled note";
  }
  if (typeof body?.content === "string") data.content = body.content;
  if (typeof body?.pinned === "boolean") data.pinned = body.pinned;
  if (typeof body?.color === "string") data.color = body.color;
  if (
    typeof body?.column === "string" &&
    /^(TODO|ONGOING|DONE)$/.test(body.column)
  ) {
    data.column = body.column;
  }
  if (typeof body?.folder === "string") {
    data.folder = body.folder.trim() === "" ? null : body.folder.trim();
  }

  const updated = await prisma.note.update({ where: { id }, data });

  broadcastAppEvent("notes_updated", { id, scope: updated.scope });
  revalidatePath("/notes");
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!isNoteModelReady()) {
    return NextResponse.json(
      { error: "Notes module is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const note = await loadNote(id);
  if (!note) return notFound();

  const isOwner = note.userId === session.id;
  const isShared = note.scope === "SHARED";
  if (!isOwner && !(isShared && canCreateSharedNotes(session))) {
    return unauthorized();
  }

  await prisma.note.delete({ where: { id } });

  broadcastAppEvent("notes_updated", { id });
  revalidatePath("/notes");
  return NextResponse.json({ success: true });
}
