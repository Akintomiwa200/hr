import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  isComputedNotificationId,
  markComputedNotificationRead,
  markNotificationRead,
} from "@/lib/notifications";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const ok = isComputedNotificationId(id)
    ? await markComputedNotificationRead(session.id, id)
    : await markNotificationRead(session.id, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
