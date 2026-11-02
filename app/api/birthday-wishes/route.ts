import { NextRequest, NextResponse } from "next/server";
import {
  createBirthdayWish,
  listBirthdayWishes,
} from "@/lib/birthday-wishes";
import { isBirthdayWishModelReady } from "@/lib/prisma";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";

function notReady() {
  return NextResponse.json(
    { error: "Birthday wishes are not ready yet. Run `prisma generate` and restart." },
    { status: 503 }
  );
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!isBirthdayWishModelReady()) return notReady();

  const recipientId = request.nextUrl.searchParams.get("recipientId") ?? undefined;
  const wishes = await listBirthdayWishes(session, recipientId || undefined);
  return NextResponse.json(wishes);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!isBirthdayWishModelReady()) return notReady();

  const body = await request.json().catch(() => null);
  const recipientId = typeof body?.recipientId === "string" ? body.recipientId.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!recipientId) return badRequest("Choose the colleague you want to celebrate.");
  if (!message) return badRequest("Write a birthday message first.");
  if (message.length > 600) return badRequest("Keep birthday wishes under 600 characters.");

  const result = await createBirthdayWish(session, { recipientId, message });
  if (!result.ok) return badRequest(result.error);

  return NextResponse.json(result.wish, { status: 201 });
}
