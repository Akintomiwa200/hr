import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { NavProvider } from "@/components/layout/nav-provider";
import { CurrencyProvider } from "@/components/providers/currency-provider";
import { prisma } from "@/lib/prisma";
import { getNavSummary } from "@/lib/nav-summary";
import { getAppCurrencyCode } from "@/lib/currency";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const firstName = session.firstName || "User";
  const lastName = session.lastName || "";
  const [navSummary, currencyCode] = await Promise.all([
    getNavSummary(session),
    getAppCurrencyCode(),
  ]);

  const employeeProfile = session.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: { avatar: true },
      })
    : null;

  return (
    <CurrencyProvider currencyCode={currencyCode}>
      <NavProvider initialSummary={navSummary}>
        <DashboardShell
          role={session.role}
          userName={`${firstName} ${lastName}`}
          userEmail={session.email}
          firstName={firstName}
          lastName={lastName}
          employeeId={session.employeeId}
          avatarUrl={employeeProfile?.avatar ?? null}
        >
          {children}
        </DashboardShell>
      </NavProvider>
    </CurrencyProvider>
  );
}
