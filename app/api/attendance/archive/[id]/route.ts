import { NextRequest, NextResponse } from "next/server";
import { forbidden, requireSession, unauthorized } from "@/lib/api-auth";
import { normalizeRole } from "@/lib/roles";
import {
  deleteAttendanceArchive,
  restoreAttendanceMonth,
} from "@/lib/attendance-archive";

function isAdmin(session: { role: string }) {
  const role = normalizeRole(session.role);
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "HR";
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();
  if (!session.companyId) return forbidden();
  const { id } = await params;

  try {
    const { restored } = await restoreAttendanceMonth(session.companyId, id);
    return NextResponse.json({ success: true, restored });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "ARCHIVE_NOT_FOUND") {
      return NextResponse.json({ error: "Archive not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();
  if (!session.companyId) return forbidden();
  const { id } = await params;

  const deleted = await deleteAttendanceArchive(session.companyId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Archive not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
