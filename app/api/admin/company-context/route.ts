import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { audit } from "@/lib/audit";
import {
  clearPlatformCompanyContext,
  createPlatformCompanyContext,
  getSession,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== Role.SUPER_ADMIN || session.platformContext) {
    return NextResponse.json({ error: "Platform administrator access required." }, { status: 403 });
  }

  let companyId = "";
  try {
    const body = (await request.json()) as { companyId?: unknown };
    companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!companyId) return NextResponse.json({ error: "Company is required." }, { status: 400 });

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, isActive: true },
  });
  if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });
  if (!company.isActive) {
    return NextResponse.json({ error: "Activate this company before entering its workspace." }, { status: 409 });
  }

  await createPlatformCompanyContext(session.id, company.id);
  await audit({
    actor: session,
    module: "platform-context",
    action: "SWITCH",
    entityId: company.id,
    entityLabel: company.name,
    meta: { companyId: company.id, mode: "company_workspace" },
  });
  return NextResponse.json({ ok: true, companyId: company.id });
}

export async function DELETE() {
  const session = await getSession();
  if (!session || !session.platformContext || !session.companyId) {
    return NextResponse.json({ error: "No active platform company context." }, { status: 403 });
  }

  await clearPlatformCompanyContext();
  await audit({
    actor: { ...session, role: Role.SUPER_ADMIN, companyId: null },
    module: "platform-context",
    action: "UPDATE",
    entityId: session.companyId,
    meta: { companyId: session.companyId, mode: "company_workspace_exit" },
  });
  return NextResponse.json({ ok: true });
}
