import { prisma } from "@/lib/prisma";

/** Read gender via SQL so reports work before `prisma generate` picks up the column. */
export async function getDistinctGenders(): Promise<string[]> {
  try {
    const rows = await prisma.$queryRaw<Array<{ gender: string }>>`
      SELECT DISTINCT gender FROM Employee WHERE gender IS NOT NULL ORDER BY gender
    `;
    return rows.map((r) => r.gender);
  } catch {
    return ["Male", "Female"];
  }
}

export async function getEmployeeGenderMap(ids: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (ids.length === 0) return map;

  try {
    const placeholders = ids.map(() => "?").join(", ");
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; gender: string | null }>>(
      `SELECT id, gender FROM Employee WHERE id IN (${placeholders})`,
      ...ids
    );
    for (const row of rows) map.set(row.id, row.gender);
  } catch {
    // Column may not exist yet — leave map empty
  }
  return map;
}
