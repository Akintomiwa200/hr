import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

async function resolveHrAssigneeId(companyId: string | null) {
  const preferRoles = ["HR", "COMPANY_ADMIN"] as const;
  for (const role of preferRoles) {
    const user = await prisma.user.findFirst({
      where: {
        role,
        ...(companyId ? { companyId } : {}),
        employee: { isNot: null },
      },
      include: { employee: true },
    });
    if (user?.employee?.id) return user.employee.id;
  }

  const anyHrEmployee = await prisma.employee.findFirst({
    where: {
      user: {
        role: { in: ["HR", "COMPANY_ADMIN"] },
        ...(companyId ? { companyId } : {}),
      },
      status: "ACTIVE",
    },
    select: { id: true },
  });
  return anyHrEmployee?.id ?? null;
}

export async function createChecklistFromTemplate(opts: {
  templateId: string;
  employeeId: string;
  companyId: string | null;
  type: "ONBOARDING" | "OFFBOARDING";
  startDate?: Date;
}) {
  const template = await prisma.checklistTemplate.findUnique({
    where: { id: opts.templateId },
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) throw new Error("Template not found");

  const employee = await prisma.employee.findUnique({
    where: { id: opts.employeeId },
    include: { manager: true },
  });
  if (!employee) throw new Error("Employee not found");

  const start = opts.startDate ?? new Date();
  const hrAssigneeId = await resolveHrAssigneeId(opts.companyId);

  const instance = await prisma.checklistInstance.create({
    data: {
      companyId: opts.companyId,
      templateId: template.id,
      type: opts.type,
      employeeId: employee.id,
      startDate: start,
      status: "IN_PROGRESS",
    },
  });

  for (const task of template.tasks) {
    let assigneeId: string | null = null;
    if (task.assigneeType === "EMPLOYEE") assigneeId = employee.id;
    else if (task.assigneeType === "LINE_MANAGER") {
      assigneeId = employee.managerId ?? hrAssigneeId;
    } else if (task.assigneeType === "HR") {
      assigneeId = hrAssigneeId;
    } else if (task.assigneeType === "SPECIFIC") {
      assigneeId = task.assigneeId;
    }

    const dueDate =
      task.dueDaysOffset != null
        ? new Date(start.getTime() + task.dueDaysOffset * 24 * 60 * 60 * 1000)
        : null;

    await prisma.checklistTask.create({
      data: {
        instanceId: instance.id,
        title: task.title,
        description: task.description,
        taskType: task.taskType,
        assigneeType: task.assigneeType,
        assigneeId,
        dueDate,
        sortOrder: task.sortOrder,
        status: "PENDING",
        priority: "MEDIUM",
      },
    });
  }

  return prisma.checklistInstance.findUnique({
    where: { id: instance.id },
    include: {
      employee: true,
      tasks: { include: { assignee: true }, orderBy: { sortOrder: "asc" } },
    },
  });
}

/** Find an active checklist instance or create one from the default template. */
export async function findOrCreateChecklistInstance(opts: {
  employeeId: string;
  companyId: string | null;
  type: "ONBOARDING" | "OFFBOARDING";
}) {
  const existing = await prisma.checklistInstance.findFirst({
    where: {
      employeeId: opts.employeeId,
      type: opts.type,
      status: { not: "COMPLETED" },
    },
  });
  if (existing) return existing;

  if (opts.type === "ONBOARDING") {
    await ensureDefaultOnboardingTemplate(opts.companyId);
  } else {
    await ensureDefaultOffboardingTemplate(opts.companyId);
  }

  const template = await prisma.checklistTemplate.findFirst({
    where: {
      type: opts.type,
      isActive: true,
      ...(opts.companyId
        ? { OR: [{ companyId: opts.companyId }, { companyId: null }] }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  if (!template) throw new Error(`No active ${opts.type.toLowerCase()} template found`);

  const created = await createChecklistFromTemplate({
    templateId: template.id,
    employeeId: opts.employeeId,
    companyId: opts.companyId,
    type: opts.type,
  });
  if (!created) throw new Error("Failed to create checklist instance");
  return created;
}

/** Prefer the latest active company template; create a default if none exists. */
export async function resolveActiveTemplate(
  type: "ONBOARDING" | "OFFBOARDING",
  companyId: string | null
) {
  if (type === "ONBOARDING") await ensureDefaultOnboardingTemplate(companyId);
  else await ensureDefaultOffboardingTemplate(companyId);

  const active = await prisma.checklistTemplate.findFirst({
    where: {
      type,
      isActive: true,
      ...(companyId
        ? { OR: [{ companyId }, { companyId: null }] }
        : {}),
    },
    orderBy: [{ companyId: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
  });
  if (active) return active;

  return type === "ONBOARDING"
    ? ensureDefaultOnboardingTemplate(companyId)
    : ensureDefaultOffboardingTemplate(companyId);
}

/** Start onboarding for a new employee (idempotent). Broadcasts live updates. */
export async function startEmployeeOnboarding(opts: {
  employeeId: string;
  companyId: string | null;
}) {
  const existing = await prisma.checklistInstance.findFirst({
    where: {
      employeeId: opts.employeeId,
      type: "ONBOARDING",
      status: { not: "COMPLETED" },
    },
  });
  if (existing) return { instance: existing, created: false as const };

  const template = await resolveActiveTemplate("ONBOARDING", opts.companyId);
  const instance = await createChecklistFromTemplate({
    templateId: template.id,
    employeeId: opts.employeeId,
    companyId: opts.companyId,
    type: "ONBOARDING",
  });

  broadcastAppEvent("checklist_updated", {
    id: instance?.id,
    employeeId: opts.employeeId,
    action: "instance_created",
  });

  return { instance, created: true as const };
}

/** Start offboarding for an employee (idempotent). Broadcasts live updates. */
export async function startEmployeeOffboarding(opts: {
  employeeId: string;
  companyId: string | null;
  deactivate?: boolean;
}) {
  const existing = await prisma.checklistInstance.findFirst({
    where: {
      employeeId: opts.employeeId,
      type: "OFFBOARDING",
      status: { not: "COMPLETED" },
    },
  });

  let instance = existing;
  let created = false;

  if (!instance) {
    const template = await resolveActiveTemplate("OFFBOARDING", opts.companyId);
    instance = await createChecklistFromTemplate({
      templateId: template.id,
      employeeId: opts.employeeId,
      companyId: opts.companyId,
      type: "OFFBOARDING",
    });
    created = true;
  }

  if (opts.deactivate) {
    await prisma.employee.update({
      where: { id: opts.employeeId },
      data: { status: "INACTIVE" },
    });
  }

  broadcastAppEvent("checklist_updated", {
    id: instance?.id,
    employeeId: opts.employeeId,
    action: created ? "instance_created" : "instance_existing",
  });
  broadcastAppEvent("employee_updated", {
    id: opts.employeeId,
    action: opts.deactivate ? "offboarded" : "offboarding_started",
  });

  return { instance, created, deactivated: Boolean(opts.deactivate) };
}


export async function ensureDefaultOnboardingTemplate(companyId: string | null) {
  const existing = await prisma.checklistTemplate.findFirst({
    where: {
      type: "ONBOARDING",
      name: "Onboarding v.1",
      ...(companyId
        ? { OR: [{ companyId }, { companyId: null }] }
        : { companyId: null }),
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    if (companyId && existing.companyId == null) {
      return prisma.checklistTemplate.update({
        where: { id: existing.id },
        data: { companyId },
      });
    }
    return existing;
  }

  return prisma.checklistTemplate.create({
    data: {
      companyId,
      type: "ONBOARDING",
      name: "Onboarding v.1",
      description: "Standard new hire onboarding checklist",
      tasks: {
        create: [
          {
            title: "Prepare company welcome kit",
            description: "Laptop, badge, and welcome materials",
            assigneeType: "HR",
            dueDaysOffset: -1,
            sortOrder: 0,
          },
          {
            title: "Collect documents - Hard copies",
            description: "ID, tax forms, and signed contract",
            assigneeType: "EMPLOYEE",
            dueDaysOffset: 3,
            sortOrder: 1,
          },
          {
            title: "Upload signed work contract",
            assigneeType: "EMPLOYEE",
            dueDaysOffset: 5,
            sortOrder: 2,
          },
          {
            title: "Line manager intro meeting",
            assigneeType: "LINE_MANAGER",
            dueDaysOffset: 1,
            sortOrder: 3,
          },
        ],
      },
    },
  });
}

export async function ensureDefaultOffboardingTemplate(companyId: string | null) {
  const existing = await prisma.checklistTemplate.findFirst({
    where: {
      type: "OFFBOARDING",
      name: "Offboarding v.1",
      ...(companyId
        ? { OR: [{ companyId }, { companyId: null }] }
        : { companyId: null }),
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    if (companyId && existing.companyId == null) {
      return prisma.checklistTemplate.update({
        where: { id: existing.id },
        data: { companyId },
      });
    }
    return existing;
  }

  return prisma.checklistTemplate.create({
    data: {
      companyId,
      type: "OFFBOARDING",
      name: "Offboarding v.1",
      description: "Standard employee exit checklist",
      tasks: {
        create: [
          {
            title: "Collect company assets",
            description: "Laptop, badge, keys, and access cards",
            assigneeType: "HR",
            dueDaysOffset: 0,
            sortOrder: 0,
          },
          {
            title: "Revoke system access",
            assigneeType: "HR",
            dueDaysOffset: 0,
            sortOrder: 1,
          },
          {
            title: "Exit interview",
            assigneeType: "LINE_MANAGER",
            dueDaysOffset: 1,
            sortOrder: 2,
          },
          {
            title: "Return documents and handover notes",
            assigneeType: "EMPLOYEE",
            dueDaysOffset: 2,
            sortOrder: 3,
          },
        ],
      },
    },
  });
}
