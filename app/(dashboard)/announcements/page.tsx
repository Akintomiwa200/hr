import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { Megaphone } from "lucide-react";
import { AnnouncementForm } from "./announcement-form";

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
      />

      {session.role === "ADMIN" && (
        <Card className="p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Create Announcement</h3>
          <AnnouncementForm />
        </Card>
      )}

      <div className="space-y-4">
        {announcements.map((ann) => (
          <Card key={ann.id} className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-sm font-semibold text-gray-900">{ann.title}</h3>
                  {ann.priority === "HIGH" && <Badge variant="error">High Priority</Badge>}
                </div>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{ann.content}</p>
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                  <span>By {ann.author}</span>
                  <span>{formatDate(ann.createdAt)}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {announcements.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-sm text-gray-500">No announcements yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
