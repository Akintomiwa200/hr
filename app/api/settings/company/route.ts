import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { badRequest, forbidden, requireSession, unauthorized } from "@/lib/api-auth";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { normalizeRole } from "@/lib/roles";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  if (!session.companyId) {
    const companies = await prisma.company.findMany({ take: 1 });
    return NextResponse.json({ company: companies[0] ?? null });
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { id: true, name: true, logo: true, email: true, phone: true, address: true },
  });

  return NextResponse.json({ company });
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const role = normalizeRole(session.role);
  if (role !== "SUPER_ADMIN" && role !== "COMPANY_ADMIN" && role !== "HR") {
    return forbidden();
  }

  if (!session.companyId) return badRequest("No company associated with this account");

  const { name, email, phone, address } = await request.json();

  const data: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) data.name = name.trim();
  if (typeof email === "string") data.email = email.trim() || null;
  if (typeof phone === "string") data.phone = phone.trim() || null;
  if (typeof address === "string") data.address = address.trim() || null;

  await prisma.company.update({
    where: { id: session.companyId },
    data,
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  broadcastAppEvent("settings_updated", { companyId: session.companyId });
  return NextResponse.json({ success: true });
}
