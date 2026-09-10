import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/roles";
import { channelDeliveryStatus } from "@/lib/bulk-delivery";
import { BulkMessagingModule } from "@/components/bulk-messaging/bulk-messaging-module";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import type { Role } from "@prisma/client";

const BULK_MESSAGING_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];

export default async function BulkMessagingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, BULK_MESSAGING_ROLES)) redirect("/dashboard");

  const departments = await prisma.department.findMany({
    where: { companyId: session.companyId },
    orderBy: { name: "asc" },
  });

  const recentMessages = await prisma.bulkMessage.findMany({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <PageLiveRefresh types={["bulk_message_created", "bulk_message_updated"]} />
      <BulkMessagingModule
        departments={departments}
        recentMessages={recentMessages}
        providerStatus={channelDeliveryStatus()}
        userName={`${session.firstName ?? ""} ${session.lastName ?? ""}`.trim() || session.email}
      />
    </div>
  );
}