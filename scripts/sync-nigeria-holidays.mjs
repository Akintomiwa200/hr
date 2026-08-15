/**
 * Sync all companies to official Nigeria 2026 public holidays.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(fileName) {
  const p = resolve(root, fileName);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnv(".env");
loadEnv(".env.local");

const HOLIDAYS = [
  { name: "New Year's Day", date: "2026-01-01", type: "Public" },
  { name: "Eid el-Fitr", date: "2026-03-20", type: "Public" },
  { name: "Eid el-Fitr Holiday", date: "2026-03-21", type: "Public" },
  { name: "Good Friday", date: "2026-04-03", type: "Public" },
  { name: "Easter Monday", date: "2026-04-06", type: "Public" },
  { name: "Workers' Day", date: "2026-05-01", type: "Public" },
  { name: "Eid el-Adha", date: "2026-05-27", type: "Public" },
  { name: "Eid el-Adha Holiday", date: "2026-05-28", type: "Public" },
  { name: "Democracy Day", date: "2026-06-12", type: "Public" },
  { name: "Eid el-Maulud", date: "2026-08-26", type: "Public" },
  { name: "Independence Day", date: "2026-10-01", type: "Public" },
  { name: "Christmas Day", date: "2026-12-25", type: "Public" },
  { name: "Boxing Day", date: "2026-12-26", type: "Public" },
];

const LEGACY_US_NAMES = [
  "Martin Luther King Jr. Day",
  "Presidents' Day",
  "Company Founders Day",
  "Memorial Day",
  "Juneteenth",
  "Labor Day",
  "Thanksgiving",
  "Day After Thanksgiving",
  "Christmas Eve",
];

const { PrismaClient } = createRequire(resolve(root, "package.json"))("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  console.log(`Syncing Nigeria 2026 holidays for ${companies.length} company(ies)…`);

  for (const c of companies) {
    await prisma.holiday.deleteMany({ where: { companyId: c.id } });
    await prisma.holiday.createMany({
      data: HOLIDAYS.map((h) => ({
        name: h.name,
        date: new Date(`${h.date}T12:00:00.000Z`),
        type: h.type,
        companyId: c.id,
      })),
    });
    console.log(`  ${c.name}: ${HOLIDAYS.length} holidays`);
  }

  const orphans = await prisma.holiday.deleteMany({
    where: {
      OR: [{ name: { in: LEGACY_US_NAMES } }, { companyId: null }],
    },
  });
  if (orphans.count) console.log(`Removed ${orphans.count} orphan/legacy holiday row(s).`);

  console.log("Done. Workers' Day is May 1 — not US Labor Day in September.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
