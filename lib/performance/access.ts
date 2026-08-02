import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isCompanyAdmin,
  isHrRole,
  isSuperAdmin,
  normalizeRole,
} from "@/lib/roles";

export function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function canViewAppraisal(
  session: SessionUser,
  appraisal: { employeeId: string; managerId: string }
) {
  const role = normalizeRole(session.role);
  if (isSuperAdmin(role) || isCompanyAdmin(role) || isHrRole(role)) return true;
  if (session.employeeId === appraisal.employeeId) return true;
  if (session.employeeId === appraisal.managerId) return true;
  if ((role === "MANAGER" || role === "SUPERVISOR") && session.employeeId) {
    const report = await prisma.employee.findFirst({
      where: { id: appraisal.employeeId, managerId: session.employeeId },
      select: { id: true },
    });
    return !!report;
  }
  return false;
}

export function canEditSelfAppraisal(
  session: SessionUser,
  appraisal: { employeeId: string; status: string }
) {
  return (
    session.employeeId === appraisal.employeeId &&
    (appraisal.status === "NOT_STARTED" || appraisal.status === "SELF_REVIEW")
  );
}

export function canEditManagerAppraisal(
  session: SessionUser,
  appraisal: { managerId: string; status: string }
) {
  if (appraisal.status === "COMPLETED" || appraisal.status === "NOT_STARTED")
    return false;
  const role = normalizeRole(session.role);
  if (isCompanyAdmin(role) || isHrRole(role)) {
    return (
      appraisal.status === "MANAGER_REVIEW" || appraisal.status === "SELF_REVIEW"
    );
  }
  return (
    session.employeeId === appraisal.managerId &&
    appraisal.status === "MANAGER_REVIEW"
  );
}

export async function appraisalListWhere(session: SessionUser) {
  const role = normalizeRole(session.role);
  if (role === "EMPLOYEE" && session.employeeId) {
    return { employeeId: session.employeeId };
  }
  if ((role === "MANAGER" || role === "SUPERVISOR") && session.employeeId) {
    return {
      OR: [
        { employeeId: session.employeeId },
        { managerId: session.employeeId },
        { employee: { managerId: session.employeeId } },
      ],
    };
  }
  return {};
}

export function computeOverallRating(
  scores: { selfScore: number | null; managerScore: number | null; weight: number }[]
) {
  const rated = scores.filter((s) => s.managerScore != null || s.selfScore != null);
  if (rated.length === 0) return null;
  const totalWeight = rated.reduce((sum, s) => sum + s.weight, 0);
  const weighted = rated.reduce((sum, s) => {
    const score = s.managerScore ?? s.selfScore ?? 0;
    return sum + score * s.weight;
  }, 0);
  return Math.round((weighted / totalWeight) * 10) / 10;
}
