/**
 * Prints database size, the largest tables and how many bytes are held by
 * legacy inline base64 images.
 *
 * Use this to confirm what is consuming the database quota (SQLSTATE 53000:
 * "Your account or project has exceeded the quota").
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/db-storage-report.ts
 */
import { getPrismaClient, prisma } from "../lib/prisma";

function mb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const [database] = await prisma.$queryRawUnsafe<{ size: string }[]>(
    "SELECT pg_size_pretty(pg_database_size(current_database())) AS size"
  );
  console.log(`database size: ${database?.size ?? "unknown"}\n`);

  const tables = await prisma.$queryRawUnsafe<
    { table_name: string; total: string; total_bytes: bigint }[]
  >(
    `SELECT c.relname AS table_name,
            pg_size_pretty(pg_total_relation_size(c.oid)) AS total,
            pg_total_relation_size(c.oid) AS total_bytes
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY pg_total_relation_size(c.oid) DESC
      LIMIT 15`
  );
  console.log("largest tables:");
  for (const table of tables) {
    console.log(`  ${table.total.padStart(10)}  ${table.table_name}`);
  }

  const [inline] = await prisma.$queryRawUnsafe<
    { avatar_bytes: bigint; logo_bytes: bigint; preference_bytes: bigint }[]
  >(
    `SELECT
       COALESCE((SELECT sum(length(avatar)) FROM "Employee" WHERE avatar LIKE 'data:%'), 0) AS avatar_bytes,
       COALESCE((SELECT sum(length(logo)) FROM "Company" WHERE logo LIKE 'data:%'), 0) AS logo_bytes,
       COALESCE((SELECT sum(length(preferences)) FROM "User" WHERE preferences LIKE '%data:image%'), 0) AS preference_bytes`
  );

  const avatarBytes = Number(inline?.avatar_bytes ?? 0);
  const logoBytes = Number(inline?.logo_bytes ?? 0);
  const preferenceBytes = Number(inline?.preference_bytes ?? 0);
  console.log("\ninline base64 images:");
  console.log(`  Employee.avatar:      ${mb(avatarBytes)}`);
  console.log(`  Company.logo:         ${mb(logoBytes)}`);
  console.log(`  User.preferences:     ${mb(preferenceBytes)}`);
  console.log(
    `  total recoverable:    ${mb(avatarBytes + logoBytes + preferenceBytes)}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrismaClient().$disconnect();
  });
