import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const emails = [
    "charlesnwodo77@gmail.com",
    "holadosu@shopperfecthq.com",
    "herkintormiwer@icloud.com",
  ];
  const candidates = ["password", "Password1", "12345678", "smart123", "SmartHR123", "changeme", "Password123", "admin123"];
  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) continue;
    const matches: string[] = [];
    for (const candidate of candidates) {
      if (await bcrypt.compare(candidate, user.passwordHash)) matches.push(candidate);
    }
    console.log(email, user.role, matches);
  }
  const hr = await prisma.user.findUnique({ where: { id: "cmvs2bp0d009fjv08qcfe143p" }, select: { email: true, role: true } });
  console.log("hr", hr);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
