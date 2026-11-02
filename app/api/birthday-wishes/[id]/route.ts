import { NextRequest, NextResponse } from "next/server";
import { deleteBirthdayWish } from "@/lib/birthday-wishes";
import { requireSession, unauthorized } from "@/lib/api-auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const result = await deleteBirthdayWish(session, id);
  if (!result.ok) {
    const status = result.error.includes("not ready") ? 503 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ success: true });
}
