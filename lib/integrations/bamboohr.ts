import { prisma } from "@/lib/prisma";
import { parseMetadata } from "@/lib/integrations/store";
import type { IntegrationRecord } from "@/lib/integrations/types";

function companyHost(integration: IntegrationRecord) {
  const slug = String(parseMetadata(integration).companyDomain || "").trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("BambooHR company domain is invalid");
  return `https://${slug}.bamboohr.com`;
}

export async function bambooHrFetch(integration: IntegrationRecord, path: string) {
  if (!integration.accessToken) throw new Error("BambooHR API key is missing");
  const basic = Buffer.from(`${integration.accessToken}:x`).toString("base64");
  const response = await fetch(`${companyHost(integration)}/api/v1${path}`, {
    headers: { Authorization: `Basic ${basic}`, Accept: "application/json" },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`BambooHR returned ${response.status}: ${text.slice(0, 240)}`);
  return text ? JSON.parse(text) as unknown : {};
}

export async function syncBambooHr(integration: IntegrationRecord) {
  const payload = await bambooHrFetch(integration, "/employees/directory");
  const directory = Array.isArray(payload) ? payload as Record<string, unknown>[] : [];
  let updated = 0;
  for (const row of directory) {
    const email = String(row.workEmail || row.email || "").trim().toLowerCase();
    if (!email) continue;
    const employee = await prisma.employee.findFirst({ where: { email: { equals: email, mode: "insensitive" }, user: { companyId: integration.companyId } }, select: { id: true } });
    if (!employee) continue;
    const data: { firstName?: string; lastName?: string; jobTitle?: string; phone?: string } = {};
    if (typeof row.firstName === "string" && row.firstName) data.firstName = row.firstName;
    if (typeof row.lastName === "string" && row.lastName) data.lastName = row.lastName;
    if (typeof row.jobTitle === "string" && row.jobTitle) data.jobTitle = row.jobTitle;
    if (typeof row.workPhone === "string" && row.workPhone) data.phone = row.workPhone;
    if (typeof row.department === "string" && row.department.trim()) {
      let department = await prisma.department.findFirst({
        where: { name: { equals: row.department.trim(), mode: "insensitive" }, companyId: integration.companyId },
        select: { id: true },
      });
      if (!department) {
        department = await prisma.department.create({
          data: { name: row.department.trim(), companyId: integration.companyId, description: "Imported from BambooHR" },
          select: { id: true },
        });
      }
      await prisma.employee.update({ where: { id: employee.id }, data: { ...data, departmentId: department.id } });
      updated++;
      continue;
    }
    if (Object.keys(data).length) {
      await prisma.employee.update({ where: { id: employee.id }, data });
      updated++;
    }
  }
  return { synced: updated, summary: `BambooHR: refreshed ${updated} matching employee profiles from ${directory.length} directory records` };
}
