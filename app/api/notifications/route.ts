import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getUserNotifications,
  markAllNotificationsRead,
  notificationToNavItem,
} from "@/lib/notifications";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await getUserNotifications(session.id, 50);
  return NextResponse.json({
    items: items.map(notificationToNavItem),
    unread: items.filter((n: { readAt: Date | null }) => !n.readAt).length,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { all?: boolean };
  if (body.all) {
    await markAllNotificationsRead(session.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
