import type { SessionUser } from "@/lib/auth";
import { canManageOrgContent } from "@/lib/roles";

export function canManageLetters(session: SessionUser) {
  return canManageOrgContent(session.role);
}

export function canViewLetterDocument(
  session: SessionUser,
  doc: { employeeId: string | null }
) {
  if (canManageLetters(session)) return true;
  return Boolean(session.employeeId && doc.employeeId === session.employeeId);
}
