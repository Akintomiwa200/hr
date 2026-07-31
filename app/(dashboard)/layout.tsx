import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
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

  const employeeCount = await prisma.employee.count();

  return (
    <RealtimeProvider>
      <div className="min-h-screen bg-[#f8f9fc]">
        <Sidebar role={session.role} userName={`${firstName} ${lastName}`} />
        <div className="ml-[260px] min-h-screen">
          <TopBar
            firstName={firstName}
            lastName={lastName}
            teamCount={Math.max(employeeCount - 3, 0)}
          />
          <main className="px-8 pb-8">{children}</main>
        </div>
      </div>
    </RealtimeProvider>
  );
}
