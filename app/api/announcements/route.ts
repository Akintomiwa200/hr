import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { canManageOrgContent } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/events";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(announcements);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !canManageOrgContent(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, content, priority = "NORMAL" } = await request.json();

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  const author = `${session.firstName ?? "Admin"} ${session.lastName ?? ""}`.trim();

  const announcement = await prisma.announcement.create({
    data: { title, content, author, priority },
  });

  broadcastEvent("announcement_created", { id: announcement.id });
  revalidatePath("/announcements");
  revalidatePath("/dashboard");

  return NextResponse.json(announcement);
}
