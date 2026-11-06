const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");
(async () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const p = new PrismaClient({ adapter });
  try {
    const users = await p.user.findMany({
      select: { email: true, role: true, passwordHash: true, isActive: true, archivedAt: true },
    });
    console.log("USERS=" + users.length);
    for (const u of users) {
      if (u.role === "SUPER_ADMIN" || u.role === "COMPANY_ADMIN") {
        const match = await bcrypt.compare("password", u.passwordHash);
        console.log(`${u.role} ${u.email} active=${u.isActive} archived=${!!u.archivedAt} password=${match}`);
      }
    }
  } catch (e) {
    console.log("ERR " + e.message);
  } finally {
    await p.$disconnect();
  }
})();
