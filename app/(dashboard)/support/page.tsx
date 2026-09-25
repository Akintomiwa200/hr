import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma, isSupportModelReady } from "@/lib/prisma";
import {
  getSupportScope,
  isSupportParticipant,
  resolveUserName,
  serializeSupportTicket,
} from "@/lib/support";
import { SupportModule } from "@/components/support/support-module";

export default async function SupportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isSupportParticipant(session.role)) redirect("/dashboard");

  if (!isSupportModelReady()) {
    return (
      <div className="pt-6 pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Support Desk</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time support between your company and the Smart HR team</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 text-sm text-amber-900">
          The Support Desk module is not ready yet. Run <code>prisma generate</code> and restart the server.
        </div>
      </div>
    );
  }

  const scope = getSupportScope(session);

  const tickets = await prisma.supportTicket.findMany({
    where: scope.isAgent ? {} : { companyId: scope.companyId ?? "__none__" },
    include: {
      company: { select: { name: true } },
      author: { include: { employee: { select: { firstName: true, lastName: true } } } },
      assignee: { include: { employee: { select: { firstName: true, lastName: true } } } },
      _count: { select: { messages: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  const agents = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    include: { employee: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" },
  });

  const companyName = scope.companyId
    ? (await prisma.company.findUnique({ where: { id: scope.companyId }, select: { name: true } }))?.name ??
      "your company"
    : "the platform";

  return (
    <SupportModule
      tickets={tickets.map(serializeSupportTicket)}
      companyName={companyName}
      isAgent={scope.isAgent}
      currentUserId={session.id}
      companies={agents.map((a) => ({
        id: a.id,
        name: resolveUserName(a),
      }))}
    />
  );
}