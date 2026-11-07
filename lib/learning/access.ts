import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import {
  employeeCompanyWhere,
  getCompanyScope,
  requireOrgCompanyId,
} from "@/lib/company-scope";
import {
  canCreateLearning,
  canManageLearning,
  normalizeRole,
} from "@/lib/roles";

export type LearningAccess = {
  companyId: string | null;
  employeeId: string | null;
  role: string;
  isCreator: boolean;
  isManager: boolean;
  isSelfService: boolean;
};

export function getLearningAccess(session: SessionUser): LearningAccess {
  const companyId = requireOrgCompanyId(getCompanyScope(session));
  const isCreator = canCreateLearning(session.role);
  const isManager = canManageLearning(session.role);
  return {
    companyId,
    employeeId: session.employeeId ?? null,
    role: normalizeRole(session.role),
    isCreator,
    isManager,
    isSelfService: !isManager,
  };
}

/** Employees whose learning a session may read. */
export function learningEmployeeWhere(
  session: SessionUser
): Prisma.EmployeeWhereInput {
  const access = getLearningAccess(session);
  if (!access.companyId) return { id: "__no_company__" };
  if (access.isCreator) {
    return employeeCompanyWhere(getCompanyScope(session));
  }
  if (!access.employeeId) return { id: "__none__" };
  if (access.isManager) {
    return {
      AND: [
        { user: { companyId: access.companyId } },
        {
          OR: [
            { id: access.employeeId },
            { managerId: access.employeeId },
          ],
        },
      ],
    };
  }
  return {
    id: access.employeeId,
    user: { companyId: access.companyId },
  };
}

/** Assignments a session may read. */
export function learningAssignmentWhere(
  session: SessionUser
): Prisma.LearningAssignmentWhereInput {
  const access = getLearningAccess(session);
  if (!access.companyId) return { companyId: "__no_company__" };
  if (access.isCreator) return { companyId: access.companyId };
  if (access.isManager && access.employeeId) {
    return {
      companyId: access.companyId,
      employee: {
        OR: [
          { id: access.employeeId },
          { managerId: access.employeeId },
        ],
      },
    };
  }
  return {
    companyId: access.companyId,
    employeeId: access.employeeId ?? "__none__",
  };
}

/** Training requests a session may read. */
export function learningRequestWhere(
  session: SessionUser
): Prisma.TrainingRequestWhereInput {
  const access = getLearningAccess(session);
  if (!access.companyId) return { companyId: "__no_company__" };
  if (access.isCreator) return { companyId: access.companyId };
  if (access.isManager && access.employeeId) {
    return {
      companyId: access.companyId,
      employee: {
        OR: [
          { id: access.employeeId },
          { managerId: access.employeeId },
        ],
      },
    };
  }
  return {
    companyId: access.companyId,
    employeeId: access.employeeId ?? "__none__",
  };
}

/** Courses a session may read. Creators see drafts; learners only see published. */
export function learningCourseWhere(
  session: SessionUser,
  includeDrafts = false
): Prisma.LearningCourseWhereInput {
  const access = getLearningAccess(session);
  if (!access.companyId) return { companyId: "__no_company__" };
  if (includeDrafts || access.isCreator) {
    return { companyId: access.companyId };
  }
  return {
    companyId: access.companyId,
    status: "PUBLISHED",
    isActive: true,
  };
}

export function canEditLearningCourse(session: SessionUser) {
  return getLearningAccess(session).isCreator;
}

/** Managers can act on their own reports; creators can act on everyone. */
export function canManageAssignmentFor(
  session: SessionUser,
  employeeId: string
) {
  const access = getLearningAccess(session);
  if (!access.companyId) return false;
  if (access.isCreator) return true;
  return access.isManager && access.employeeId === employeeId;
}
