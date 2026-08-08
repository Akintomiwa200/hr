import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewReports } from "@/lib/reports/access";
import { timeOffTabs } from "@/lib/reports/catalog";
import { ReportsSubNavClient } from "@/components/reports/reports-sub-nav-client";

export default async function TimeOffReportsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || !canViewReports(session)) redirect("/dashboard");

  return (
    <div>
      <ReportsSubNavClient tabs={timeOffTabs} />
      {children}
    </div>
  );
}
