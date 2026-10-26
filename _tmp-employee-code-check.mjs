import fs from "node:fs";
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";

const env = fs.readFileSync(".env", "utf8");
const secretMatch = env.match(/^JWT_SECRET=(.*)$/m);
const secret = new TextEncoder().encode(
  secretMatch
    ? secretMatch[1].trim().replace(/^["']|["']$/g, "")
    : "smart-hr-dev-secret"
);

const prisma = new PrismaClient();
const user = await prisma.user.findFirst({
  where: { role: "COMPANY_ADMIN", companyId: { not: null } },
});
if (!user) throw new Error("No company admin found");

const token = await new SignJWT({
  user: { id: user.id, email: user.email, role: user.role, companyId: user.companyId },
})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

const headers = { cookie: `smart-hr-session=${token}` };
const listRes = await fetch("http://localhost:3000/api/employees", { headers });
const listBody = await listRes.text();
console.log("list", listRes.status, listBody.slice(0, 300));
const employees = JSON.parse(listBody);
if (!Array.isArray(employees) || employees.length < 1) {
  throw new Error(`Unexpected employee list: ${listRes.status}`);
}

const target = employees[0];
const other = await prisma.employee.findFirst({
  where: { id: { not: target.id } },
  select: { employeeCode: true },
});
if (!other) throw new Error("No second employee found for duplicate check");

const emptyRes = await fetch(`http://localhost:3000/api/employees/${target.id}`, {
  method: "PATCH",
  headers: { ...headers, "content-type": "application/json" },
  body: JSON.stringify({ employeeCode: "   " }),
});
console.log("empty-code", emptyRes.status, await emptyRes.text());

const duplicateRes = await fetch(
  `http://localhost:3000/api/employees/${target.id}`,
  {
    method: "PATCH",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ employeeCode: other.employeeCode }),
  }
);
console.log("duplicate-code", duplicateRes.status, await duplicateRes.text());

const after = await prisma.employee.findUnique({
  where: { id: target.id },
  select: { employeeCode: true },
});
console.log("unchanged", after.employeeCode === target.employeeCode, target.employeeCode);

await prisma.$disconnect();
