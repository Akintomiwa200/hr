import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { normalizeRole } from "@/lib/roles";
import { isResignationAdmin, type ResignationPeople } from "@/lib/resignation/access";

export const resignationInclude = {
  employee: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      jobTitle: true,
      avatar: true,
      managerId: true,
      status: true,
      department: { select: { name: true } },
      user: { select: { id: true, companyId: true, role: true } },
      managers: { select: { id: true } },
    },
  },
  manager: { select: { id: true, firstName: true, lastName: true } },
  hrReviewer: { select: { id: true, firstName: true, lastName: true } },
  events: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.ResignationInclude;

export const resignationListInclude = {
  employee: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      jobTitle: true,
      avatar: true,
      managerId: true,
      status: true,
      department: { select: { name: true } },
      user: { select: { id: true, companyId: true, role: true } },
      managers: { select: { id: true } },
    },
  },
  manager: { select: { id: true, firstName: true, lastName: true } },
  hrReviewer: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ResignationInclude;

export type ResignationWithPeople = Prisma.ResignationGetPayload<{
  include: typeof resignationInclude;
}>;

export type ResignationListRow = Prisma.ResignationGetPayload<{
  include: typeof resignationListInclude;
}>;

/** Company-scoped visibility for resignation lists and detail pages. */
export function resignationScopeWhere(
  session: SessionUser
): Prisma.ResignationWhereInput {
  const role = normalizeRole(session.role);
  const companyWhere = session.companyId ? { companyId: session.companyId } : {};

  if (isResignationAdmin(role)) return companyWhere;

  if (!session.employeeId) {
    return { ...companyWhere, employeeId: "__none__" };
  }

  if (role === "MANAGER" || role === "SUPERVISOR") {
    return {
      ...companyWhere,
      OR: [
        { employeeId: session.employeeId },
        { managerId: session.employeeId },
        {
          employee: {
            OR: [
              { managerId: session.employeeId },
              { managers: { some: { id: session.employeeId } } },
            ],
          },
        },
      ],
    };
  }

  return { ...companyWhere, employeeId: session.employeeId };
}

export function resignationPeople(row: {
  employeeId: string;
  managerId?: string | null;
  employee?: {
    managerId?: string | null;
    managers?: { id: string }[];
  } | null;
}): ResignationPeople {
  return {
    employeeId: row.employeeId,
    managerId: row.managerId,
    employeeManagerId: row.employee?.managerId ?? null,
    additionalManagerIds: row.employee?.managers?.map((manager) => manager.id) ?? [],
  };
}
