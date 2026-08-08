import { prisma } from "@/lib/prisma";

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

  const hrUser = await prisma.user.findFirst({
    where: { companyId: opts.companyId ?? undefined, role: "HR" },
    include: { employee: true },
  });

  for (const task of template.tasks) {
    let assigneeId: string | null = null;
    if (task.assigneeType === "EMPLOYEE") assigneeId = employee.id;
    else if (task.assigneeType === "LINE_MANAGER") assigneeId = employee.managerId;
    else if (task.assigneeType === "HR") assigneeId = hrUser?.employee?.id ?? null;
    else if (task.assigneeType === "SPECIFIC") assigneeId = task.assigneeId;

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

  const template = await prisma.checklistTemplate.findFirst({
    where: {
      type: opts.type,
      isActive: true,
      ...(opts.companyId ? { companyId: opts.companyId } : {}),
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

export async function ensureDefaultOnboardingTemplate(companyId: string | null) {
  const existing = await prisma.checklistTemplate.findFirst({
    where: { companyId, type: "ONBOARDING", name: "Onboarding v.1" },
  });
  if (existing) return existing;

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
