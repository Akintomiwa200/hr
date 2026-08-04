import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { NotificationsModule } from "@/components/notifications/notifications-module";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Leave updates, announcements, and payroll alerts — refreshed in real time.
        </p>
      </div>

      <NotificationsModule />
    </div>
  );
}
