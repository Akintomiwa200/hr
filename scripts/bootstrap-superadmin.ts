import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

for (const f of [".env", ".env.local"]) {
  const p = resolve(f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

async function main() {
  try {
    const passwordHash = await bcrypt.hash("password", 10);
    const superAdmin = await prisma.user.upsert({
      where: { email: "superadmin@smarthr.com" },
      update: { role: "SUPER_ADMIN", passwordHash },
      create: { email: "superadmin@smarthr.com", passwordHash, role: "SUPER_ADMIN" },
    });
    console.log(`Super Admin: ${superAdmin.email}`);

    try {
      await prisma.platformSettings.upsert({
        where: { id: "platform" },
        update: {},
        create: { id: "platform", currencyCode: "NGN" },
      });
      console.log("platformSettings: ensured");
    } catch {
      console.log("platformSettings: skipped (model may not exist)");
    }
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
