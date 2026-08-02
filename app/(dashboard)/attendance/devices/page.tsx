import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageDevices } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { DeviceIntegrationHub } from "@/components/attendance/device-integration-hub";

export default async function AttendanceDevicesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!canManageDevices(session.role)) {
    redirect("/attendance");
  }

  return (
    <div>
      <PageHeader
        title="Device integration"
        description="API endpoints, live device status, and check-in app connection"
        action={<ModulePageActions helpSlug="attendance" helpLabel="Attendance guide" />}
      />
      <DeviceIntegrationHub />
    </div>
  );
}
