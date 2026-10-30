import bcrypt from "bcryptjs";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { prisma } from "../lib/prisma";

const BACKUP = `${process.env.TEMP}\\smart-hr-charles-hash.txt`;

async function main() {
  const action = process.argv[2] ?? "set";
  const user = await prisma.user.findUnique({
    where: { email: "charlesnwodo77@gmail.com" },
    select: { id: true, passwordHash: true },
  });
  if (!user) throw new Error("user not found");

  if (action === "set") {
    if (!existsSync(BACKUP)) writeFileSync(BACKUP, user.passwordHash, "utf8");
    const hash = await bcrypt.hash("TestPass123!", 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    console.log("password set");
  } else {
    const original = readFileSync(BACKUP, "utf8");
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: original } });
    console.log("password restored");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
