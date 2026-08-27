import { NextResponse } from "next/server";
import { prisma, isPortalTemplateModelReady } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, portalDocumentCompanyWhere } from "@/lib/company-scope";
import { canManageLetters } from "@/lib/letters/access";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!isPortalTemplateModelReady()) {
    return NextResponse.json({ error: "Letters & forms are not ready." }, { status: 503 });
  }

  const scope = getCompanyScope(session);
  const where = canManageLetters(session)
    ? portalDocumentCompanyWhere(scope)
    : {
        ...portalDocumentCompanyWhere(scope),
        employeeId: session.employeeId ?? "__none__",
      };

  const documents = await prisma.portalDocument.findMany({
    where,
    include: {
      employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      template: { select: { id: true, title: true, category: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(documents);
}
