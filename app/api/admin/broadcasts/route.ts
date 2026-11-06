import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyCompanyUsers } from "@/lib/notifications";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (session.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Super Admin access is required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const priority = body?.priority === "URGENT" ? "URGENT" : body?.priority === "HIGH" ? "HIGH" : "NORMAL";
  if (title.length < 3 || title.length > 140 || content.length < 8 || content.length > 5000) {
    return NextResponse.json({ error: "Enter a title (3–140 characters) and message (8–5,000 characters)." }, { status: 400 });
  }
  const author = [session.firstName, session.lastName].filter(Boolean).join(" ") || session.email;
  const announcement = await prisma.announcement.create({ data: { companyId: null, title, content, priority, author } });
  const companies = await prisma.company.findMany({ where: { isActive: true }, select: { id: true } });
  await Promise.all(companies.map((company) => notifyCompanyUsers(company.id, { type: "announcement", title: "Platform announcement", message: title, href: "/announcements" })));
  await audit({ actor: session, module: "platform-broadcasts", action: "CREATE", entityId: announcement.id, entityLabel: title, meta: { priority, notifiedCompanies: companies.length } });
  broadcastAppEvent("announcement_created", { id: announcement.id, platformWide: true });
  return NextResponse.json({ announcement, notifiedCompanies: companies.length }, { status: 201 });
}
