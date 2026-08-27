import type { SessionUser } from "@/lib/auth";
import { canManageChecklists } from "@/lib/checklist/access";

type TaskAccessShape = {
  assigneeId?: string | null;
  instance?: { employeeId?: string | null } | null;
};

export function canAccessChecklistTask(session: SessionUser, task: TaskAccessShape) {
  if (canManageChecklists(session)) return true;
  if (session.employeeId && task.assigneeId === session.employeeId) return true;
  if (session.employeeId && task.instance?.employeeId === session.employeeId) return true;
  return false;
}

export function canCompleteChecklistTask(session: SessionUser, task: TaskAccessShape) {
  return canAccessChecklistTask(session, task);
}

export function canUploadChecklistDocument(session: SessionUser, task: TaskAccessShape) {
  return canCompleteChecklistTask(session, task);
}
