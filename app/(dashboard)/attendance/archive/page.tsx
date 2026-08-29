import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageDevices } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { AttendanceArchivePanel } from "@/components/attendance/attendance-archive-panel";

export default async function AttendanceArchivePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!canManageDevices(session.role)) {
    redirect("/attendance");
  }

  return (
    <div>
      <PageHeader
        title="Attendance archive"
        description="Move completed attendance months to Cloudinary to free primary-storage space"
        action={<ModulePageActions helpSlug="attendance" helpLabel="Attendance guide" />}
      />
      <AttendanceArchivePanel />
    </div>
  );
}
