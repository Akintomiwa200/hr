import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { hasRole } from "@/lib/roles";
import type { Role } from "@prisma/client";

const BULK_MESSAGING_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !hasRole(session.role, BULK_MESSAGING_ROLES)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = getCompanyScope(session);
  const companyId = requireOrgCompanyId(scope);

  const { id } = await params;
  const message = await prisma.bulkMessage.findFirst({
    where: { id, ...(companyId ? { companyId } : {}) },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const recipients = await prisma.bulkMessageRecipient.findMany({
    where: { messageId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      recipientName: true,
      recipientEmail: true,
      recipientPhone: true,
      status: true,
      error: true,
      sentAt: true,
    },
  });

  return NextResponse.json({ message, recipients });
}