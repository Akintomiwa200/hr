import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getNotificationFeed } from "@/lib/nav-summary";
import { markAllNotificationsRead } from "@/lib/notifications";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feed = await getNotificationFeed(session);
  return NextResponse.json({
    items: feed.items,
    unread: feed.unreadCount,
    pendingLeaveCount: feed.pendingLeaveCount,
    pendingResignationCount: feed.pendingResignationCount,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { all?: boolean };
  if (body.all) {
    const feed = await getNotificationFeed(session);
    const computedKeys = feed.items
      .filter((item) => !item.persistent)
      .map((item) => item.id);
    await markAllNotificationsRead(session.id, computedKeys);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
