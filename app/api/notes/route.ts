import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma, isNoteModelReady } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { getCompanyScope, noteCompanyWhere, requireOrgCompanyId } from "@/lib/company-scope";
import { badRequest, unauthorized } from "@/lib/api-auth";
import { canCreateSharedNotes } from "@/lib/notes/access";

const PRIVATE_SCOPE = "PRIVATE";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isNoteModelReady()) {
    return NextResponse.json(
      { error: "Notes module is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }

  const scope = getCompanyScope(session);

  // Personal notes (owned by this user) + SHARED company notes.
  const notes = await prisma.note.findMany({
    where: {
      OR: [{ userId: session.id }, { scope: "SHARED", ...noteCompanyWhere(scope) }],
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(notes);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isNoteModelReady()) {
    return NextResponse.json(
      { error: "Notes module is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const pinned = body?.pinned === true;
  const color = typeof body?.color === "string" ? body.color : "violet";
  const column =
    typeof body?.column === "string" && /^(TODO|ONGOING|DONE)$/.test(body.column)
      ? body.column
      : "TODO";
  const folder =
    typeof body?.folder === "string" && body.folder.trim() !== ""
      ? body.folder.trim()
      : null;
  const scope =
    body?.scope === "SHARED"
      ? "SHARED"
      : body?.scope === "PRIVATE"
      ? "PRIVATE"
      : "PRIVATE";

  if (!title && !content) {
    return badRequest("A note needs a title or some content.");
  }

  if (scope === "SHARED" && !canCreateSharedNotes(session)) {
    return unauthorized();
  }

  const companyScope = getCompanyScope(session);
  const companyId = requireOrgCompanyId(companyScope);

  const note = await prisma.note.create({
    data: {
      title: title || "Untitled note",
      content,
      pinned,
      color,
      column,
      folder,
      scope: scope || PRIVATE_SCOPE,
      companyId: scope === "SHARED" ? companyId : undefined,
      userId: session.id,
      employeeId: session.employeeId ?? null,
    },
  });

  broadcastAppEvent("notes_updated", { id: note.id, scope: note.scope });
  revalidatePath("/notes");

  return NextResponse.json(note);
}
