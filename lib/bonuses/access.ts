import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import {
  BONUS_ADMIN_ROLES,
  BONUS_APPROVER_ROLES,
  BONUS_VIEW_ROLES,
  hasRole,
  isSuperAdmin,
  normalizeRole,
} from "@/lib/roles";

export function canViewBonuses(role: SessionUser["role"]) {
  return hasRole(role, BONUS_VIEW_ROLES) || isSuperAdmin(role);
}

export function canManageBonuses(role: SessionUser["role"]) {
  return hasRole(role, BONUS_ADMIN_ROLES) || isSuperAdmin(role);
}

export function canApproveBonuses(role: SessionUser["role"]) {
  return hasRole(role, BONUS_APPROVER_ROLES) || isSuperAdmin(role);
}

/**
 * Employees only ever see their own awards. Everyone else who can open the
 * module sees company-wide awards (subject to company scoping).
 */
export function bonusSeesOnlyOwn(role: SessionUser["role"]) {
  return normalizeRole(role) === "EMPLOYEE";
}

export function bonusAwardWhere(
  session: SessionUser,
  extra: Prisma.BonusAwardWhereInput = {}
): Prisma.BonusAwardWhereInput {
  const scope: Prisma.BonusAwardWhereInput = { ...extra };

  if (bonusSeesOnlyOwn(session.role)) {
    scope.employeeId = session.employeeId ?? "__none__";
  } else if (session.companyId) {
    scope.companyId = session.companyId;
  } else if (!isSuperAdmin(session.role)) {
    scope.companyId = "__none__";
  }

  return scope;
}

export function bonusTypeWhere(
  session: SessionUser,
  extra: Prisma.BonusTypeWhereInput = {}
): Prisma.BonusTypeWhereInput {
  const scope: Prisma.BonusTypeWhereInput = { ...extra };
  if (session.companyId) {
    scope.companyId = session.companyId;
  } else if (!isSuperAdmin(session.role)) {
    scope.companyId = "__none__";
  }
  return scope;
}
