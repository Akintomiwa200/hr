import { prisma } from "@/lib/prisma";
import { devicePinLookupKeys, pinSearchVariants } from "@/lib/zkteco/pin-match";

export type EmployeePinIndex = Map<string, Array<{ id: string; branchId: string | null }>>;

/** One DB read per ingest batch — avoids loading all employees for every punch row. */
export async function buildEmployeePinIndex(companyId: string | null): Promise<EmployeePinIndex> {
  const people = await prisma.employee.findMany({
    where: {
      status: "ACTIVE",
      ...(companyId ? { user: { companyId } } : {}),
    },
    select: {
      id: true,
      branchId: true,
      employeeCode: true,
      biometricPin: true,
    },
  });

  const index: EmployeePinIndex = new Map();
  for (const person of people) {
    const entry = { id: person.id, branchId: person.branchId };
    const keys = pinSearchVariants(person.biometricPin, person.employeeCode);
    for (const key of keys) {
      const list = index.get(key) ?? [];
      if (!list.some((row) => row.id === person.id)) list.push(entry);
      index.set(key, list);
    }
  }
  return index;
}

export function lookupEmployeeFromPinIndex(
  devicePin: string,
  index: EmployeePinIndex,
  preferBranchId?: string | null
) {
  const keys = devicePinLookupKeys(devicePin);
  for (const key of keys) {
    const matches = index.get(key);
    if (!matches?.length) continue;
    if (preferBranchId) {
      const atBranch = matches.find((row) => row.branchId === preferBranchId);
      if (atBranch) return atBranch.id;
    }
    return matches[0].id;
  }
  return null;
}
