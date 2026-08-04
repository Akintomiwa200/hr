import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { NavProvider } from "@/components/layout/nav-provider";
import { getNavSummary } from "@/lib/nav-summary";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const firstName = session.firstName || "User";
  const lastName = session.lastName || "";
  const navSummary = await getNavSummary(session);

  return (
    <NavProvider initialSummary={navSummary}>
      <DashboardShell
        role={session.role}
        userName={`${firstName} ${lastName}`}
        userEmail={session.email}
        firstName={firstName}
        lastName={lastName}
      >
        {children}
      </DashboardShell>
    </NavProvider>
  );
}
