/**
 * Minimal bootstrap seed — does NOT wipe real tenant data.
 * Creates platform Super Admin only. Companies/people are created in the app.
 */
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("password", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@smarthr.com" },
    update: {
      role: Role.SUPER_ADMIN,
      passwordHash,
    },
    create: {
      email: "superadmin@smarthr.com",
      passwordHash,
      role: Role.SUPER_ADMIN,
    },
  });

  await prisma.platformSettings.upsert({
    where: { id: "platform" },
    update: {},
    create: {
      id: "platform",
      currencyCode: "NGN",
    },
  }).catch(() => {
    // platformSettings may not exist on older DBs; ignore
  });

  console.log("Bootstrap seed complete (no demo company/people).");
  console.log(`  Super Admin: ${superAdmin.email} / password`);
  console.log("  Create real companies and staff from the app.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
