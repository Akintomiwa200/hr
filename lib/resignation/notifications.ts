import { prisma } from "@/lib/prisma";
import { createNotification, notifyCompanyUsers } from "@/lib/notifications";
import { fullName } from "@/lib/utils";

type ResignationNoticeInput = {
  resignationId: string;
  companyId: string | null;
  employeeName: string;
  employeeUserId?: string | null;
  managerId?: string | null;
  managerEndorsementRequired?: boolean;
  lastWorkingDay: Date;
};

const HR_NOTIFY_ROLES = ["HR", "COMPANY_ADMIN"];

function hrefFor(id: string) {
  return `/resignation/${id}`;
}

function formatDay(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Tell the line manager and HR that a new resignation needs attention. */
export async function notifyResignationSubmitted(input: ResignationNoticeInput) {
  const href = hrefFor(input.resignationId);
  const message = `${input.employeeName} resigned. Last working day ${formatDay(input.lastWorkingDay)}.`;

  if (input.managerId) {
    const manager = await prisma.employee.findUnique({
      where: { id: input.managerId },
      select: { userId: true },
    });
    if (manager?.userId) {
      await createNotification({
        userId: manager.userId,
        type: "resignation",
        title:
          input.managerEndorsementRequired === false
            ? "Resignation submitted"
            : "Resignation endorsement needed",
        message,
        href,
      });
    }
  }

  if (input.companyId) {
    await notifyCompanyUsers(
      input.companyId,
      {
        type: "resignation",
        title: "Resignation submitted",
        message,
        href,
      },
      { roles: HR_NOTIFY_ROLES }
    );
  }
}

/** Notify HR once a manager has endorsed the resignation. */
export async function notifyResignationEndorsed(input: {
  resignationId: string;
  companyId: string | null;
  employeeName: string;
}) {
  if (!input.companyId) return;
  await notifyCompanyUsers(
    input.companyId,
    {
      type: "resignation",
      title: "Resignation ready for HR approval",
      message: `${input.employeeName}'s resignation was endorsed by their manager.`,
      href: hrefFor(input.resignationId),
    },
    { roles: HR_NOTIFY_ROLES }
  );
}

/** Notify the employee of a decision or a schedule change. */
export async function notifyResignationEmployee(input: {
  resignationId: string;
  userId?: string | null;
  title: string;
  message: string;
}) {
  if (!input.userId) return;
  await createNotification({
    userId: input.userId,
    type: "resignation",
    title: input.title,
    message: input.message,
    href: hrefFor(input.resignationId),
  });
}

export async function notifyResignationStakeholdersOfDecision(input: {
  resignationId: string;
  companyId: string | null;
  employeeName: string;
  title: string;
  message: string;
}) {
  if (!input.companyId) return;
  await notifyCompanyUsers(
    input.companyId,
    {
      type: "resignation",
      title: input.title,
      message: input.message,
      href: hrefFor(input.resignationId),
    },
    { roles: HR_NOTIFY_ROLES }
  );
}

export function employeeDisplayName(employee: {
  firstName: string;
  lastName: string;
  middleName?: string | null;
}) {
  return fullName(employee.firstName, employee.lastName, employee.middleName);
}
