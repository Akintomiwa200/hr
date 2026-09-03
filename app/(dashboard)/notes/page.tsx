import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma, isNoteModelReady } from "@/lib/prisma";
import { NotesModule } from "@/components/notes/notes-module";
import { canCreateSharedNotes } from "@/lib/notes/access";
import { getCompanyScope, noteCompanyWhere } from "@/lib/company-scope";

export default async function NotesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!isNoteModelReady()) {
    return (
      <div className="pt-6 pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
          <p className="text-sm text-gray-500 mt-1">Your personal note taker</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 text-sm text-amber-900">
          The Notes module is not ready yet. Run <code>prisma generate</code> and restart the
          server.
        </div>
      </div>
    );
  }

  const scope = getCompanyScope(session);
  const canShare = canCreateSharedNotes(session);

  const notes = await prisma.note.findMany({
    where: {
      OR: [{ userId: session.id }, { scope: "SHARED", ...noteCompanyWhere(scope) }],
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="pt-6 pb-8">
      <NotesModule
        notes={notes}
        canShare={canShare}
        canManageShared={canShare}
        currentUserId={session.id}
      />
    </div>
  );
}
