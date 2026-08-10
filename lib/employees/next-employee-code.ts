import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Next globally unique employee code (EMP001, EMP002, …). */
export async function nextEmployeeCode(client: DbClient = prisma): Promise<string> {
  const employees = await client.employee.findMany({
    select: { employeeCode: true },
    where: { employeeCode: { startsWith: "EMP" } },
  });

  let max = 0;
  for (const { employeeCode } of employees) {
    const match = employeeCode.match(/^EMP(\d+)$/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }

  let n = max + 1;
  while (n < 100000) {
    const code = `EMP${String(n).padStart(3, "0")}`;
    const taken = await client.employee.findUnique({
      where: { employeeCode: code },
      select: { id: true },
    });
    if (!taken) return code;
    n++;
  }

  return `EMP${Date.now().toString(36).toUpperCase()}`;
}
