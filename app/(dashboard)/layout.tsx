import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const firstName = session.firstName || "User";
  const lastName = session.lastName || "";

  const [employeeCount, notificationCount] = await Promise.all([
    prisma.employee.count(),
    prisma.announcement.count(),
  ]);

  return (
    <RealtimeProvider>
      <DashboardShell
        role={session.role}
        userName={`${firstName} ${lastName}`}
        userEmail={session.email}
        firstName={firstName}
        lastName={lastName}
        teamCount={Math.max(employeeCount - 3, 0)}
        notificationCount={notificationCount}
      >
        {children}
      </DashboardShell>
    </RealtimeProvider>
  );
}
