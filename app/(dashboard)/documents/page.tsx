import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { DocumentsModule } from "@/components/documents/documents-module";
import { HelpLink } from "@/components/help/help-link";

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const whereClause =
    session.role === "EMPLOYEE" && session.employeeId
      ? { OR: [{ employeeId: null }, { employeeId: session.employeeId }] }
      : {};

  const [documents, employees] = await Promise.all([
    prisma.document.findMany({
      where: whereClause,
      include: { employee: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Company policies, contracts, and employee documents"
        action={<HelpLink slug="documents" label="Documents guide" />}
      />
      <DocumentsModule
        documents={documents}
        employees={employees}
        canManage={session.role === "ADMIN" || session.role === "MANAGER"}
      />
    </div>
  );
}
