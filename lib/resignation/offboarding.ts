import { prisma } from "@/lib/prisma";
import { startEmployeeOffboarding } from "@/lib/checklist/instantiate";

/**
 * Hand a resignation over to the existing offboarding engine.
 * Approval starts the exit checklist; completion also deactivates the employee.
 */
export async function startResignationOffboarding(input: {
  resignationId: string;
  employeeId: string;
  companyId: string | null;
  endDate: Date;
  deactivate?: boolean;
}) {
  const result = await startEmployeeOffboarding({
    employeeId: input.employeeId,
    companyId: input.companyId,
    deactivate: input.deactivate ?? false,
    endDate: input.endDate,
  });

  const instanceId = result.instance?.id ?? null;
  if (instanceId) {
    await prisma.resignation.update({
      where: { id: input.resignationId },
      data: { offboardingInstanceId: instanceId },
    });
  }

  return result;
}
