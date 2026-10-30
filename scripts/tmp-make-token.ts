import "dotenv/config";
import { SignJWT } from "jose";
import { prisma } from "../lib/prisma";

async function main() {
  const email = process.argv[2] ?? "charlesnwodo77@gmail.com";
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      companyId: true,
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!user) throw new Error("user not found");
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "smart-hr-dev-secret"
  );
  const token = await new SignJWT({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      firstName: user.employee?.firstName ?? undefined,
      lastName: user.employee?.lastName ?? undefined,
      employeeId: user.employee?.id,
    },
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  console.log(token);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
