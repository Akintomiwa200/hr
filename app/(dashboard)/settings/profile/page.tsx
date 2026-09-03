import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileSettingsModule } from "@/components/settings/profile-settings-module";

export default async function ProfileSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { preferences: true },
  });

  const employee = session.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.employeeId },
        include: { department: true },
      })
    : null;

  let preferences: Record<string, boolean> = {};
  if (user?.preferences) {
    try {
      preferences = JSON.parse(user.preferences);
    } catch {
      preferences = {};
    }
  }

  return (
    <div>
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-brand-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Profile &amp; notifications</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Manage your account details and the updates you receive.
      </p>
      <ProfileSettingsModule
        email={session.email}
        role={session.role}
        employee={employee}
        preferences={preferences}
      />
    </div>
  );
}