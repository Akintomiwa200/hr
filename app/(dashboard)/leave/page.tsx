import { redirect } from "next/navigation";
import { getSession, canApproveLeave } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { LeaveModule } from "@/components/leave/leave-module";

export default async function LeavePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const whereClause =
    session.role === "EMPLOYEE" && session.employeeId
      ? { employeeId: session.employeeId }
      : {};

  const leaves = await prisma.leaveRequest.findMany({
    where: whereClause,
    include: { employee: true, approver: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Leave"
        description={
          session.role === "EMPLOYEE"
            ? "Request time off and track approval status"
            : "Review and approve team leave requests"
        }
        action={<ModulePageActions helpSlug="leave" showCalendar calendarLabel="Leave calendar" />}
      />
      <LeaveModule
        leaves={leaves}
        canApprove={canApproveLeave(session.role)}
        isEmployee={session.role === "EMPLOYEE"}
        showRequestForm={session.role === "EMPLOYEE"}
      />
    </div>
  );
}
