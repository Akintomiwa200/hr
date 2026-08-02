import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageOrgContent } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { AnnouncementsModule } from "@/components/announcements/announcements-module";
import { HelpLink } from "@/components/help/help-link";

export default async function AnnouncementsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Company news and important updates"
        action={<HelpLink slug="announcements" label="Announcements guide" />}
      />
      <AnnouncementsModule
        announcements={announcements}
        canManage={canManageOrgContent(session.role)}
      />
    </div>
  );
}
