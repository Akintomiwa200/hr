import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { SettingsModule } from "@/components/settings/settings-module";
import { ModulePageActions } from "@/components/help/module-page-actions";
export default async function SettingsPage() {
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
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
        action={<ModulePageActions helpSlug="settings" helpLabel="Settings guide" />}
      />
      <SettingsModule
        email={session.email}
        role={session.role}
        employee={employee}
        preferences={preferences}
      />
    </div>
  );
}
