import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { DEFAULT_EMPLOYEE_PASSWORD } from "@/lib/constants/auth";
import { nextEmployeeCode } from "@/lib/employees/next-employee-code";
import { replayUnprocessedPunches } from "@/lib/zkteco/service";
import { scheduleLiveDevicePulls } from "@/lib/zkteco/live-pull";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export type DeviceEmployeeRow = {
  pin: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  jobTitle?: string | null;
  departmentName?: string | null;
  employeeCode?: string | null;
};

export type ImportDeviceEmployeesOptions = {
  companyId: string;
  departmentId: string;
  branchId?: string | null;
  rows: DeviceEmployeeRow[];
  skipExistingPin?: boolean;
  updateExistingPin?: boolean;
};

export type ImportDeviceEmployeesResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

function slugEmailPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, ".").replace(/\.+/g, ".").replace(/^\.|\.$/g, "");
}

async function uniqueImportEmail(companyId: string, pin: string, firstName: string, lastName: string) {
  const base = slugEmailPart(`${firstName}.${lastName}.${pin}`).toLowerCase() || `pin.${pin}`;
  const domain = "staff.import.smarthr";
  let candidate = `${base}@${domain}`;
  let n = 1;
  while (await prisma.user.findUnique({ where: { email: candidate } })) {
    n += 1;
    candidate = `${base}.${n}@${domain}`;
  }
  return candidate;
}

export async function importDeviceEmployees(
  options: ImportDeviceEmployeesOptions
): Promise<ImportDeviceEmployeesResult> {
  const passwordHash = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  const existing = await withPrismaRetry(() =>
    prisma.employee.findMany({
      where: { user: { companyId: options.companyId } },
      select: {
        id: true,
        biometricPin: true,
        employeeCode: true,
        email: true,
        userId: true,
      },
    })
  );

  const byPin = new Map<string, (typeof existing)[number]>();
  for (const person of existing) {
    if (person.biometricPin?.trim()) {
      byPin.set(person.biometricPin.trim().toUpperCase(), person);
    }
  }

  const usedCodes = new Set(existing.map((e) => e.employeeCode?.trim()).filter(Boolean));

  async function resolveEmployeeCode(row: DeviceEmployeeRow): Promise<string> {
    const fromFile = row.employeeCode?.trim();
    if (fromFile && !usedCodes.has(fromFile)) {
      usedCodes.add(fromFile);
      return fromFile;
    }
    const generated = await nextEmployeeCode();
    usedCodes.add(generated);
    return generated;
  }

  for (const row of options.rows) {
    const pin = row.pin.trim();
    if (!pin) {
      skipped += 1;
      continue;
    }

    const pinKey = pin.toUpperCase();
    const hit = byPin.get(pinKey);

    try {
      if (hit) {
        if (options.updateExistingPin !== false) {
          await withPrismaRetry(() =>
            prisma.employee.update({
              where: { id: hit.id },
              data: {
                biometricPin: pin,
                ...(options.branchId ? { branchId: options.branchId } : {}),
                status: "ACTIVE",
              },
            })
          );
          updated += 1;
        } else {
          skipped += 1;
        }
        continue;
      }

      if (options.skipExistingPin) {
        skipped += 1;
        continue;
      }

      const email =
        row.email?.trim().toLowerCase() ||
        (await uniqueImportEmail(options.companyId, pin, row.firstName, row.lastName));

      const taken = await withPrismaRetry(() =>
        prisma.user.findUnique({ where: { email } })
      );
      if (taken) {
        errors.push(`PIN ${pin}: email ${email} already exists`);
        skipped += 1;
        continue;
      }

      const employeeCode = await resolveEmployeeCode(row);
      const user = await withPrismaRetry(() =>
        prisma.user.create({
          data: {
            email,
            passwordHash,
            role: Role.EMPLOYEE,
            companyId: options.companyId,
            employee: {
              create: {
                employeeCode,
                firstName: row.firstName.trim() || "Staff",
                lastName: row.lastName.trim() || pin,
                email,
                jobTitle: row.jobTitle?.trim() || "Staff",
                employmentType: "FULL_TIME",
                departmentId: options.departmentId,
                branchId: options.branchId ?? null,
                biometricPin: pin,
                hireDate: new Date(),
                salary: 0,
                status: "ACTIVE",
              },
            },
          },
          include: { employee: { select: { id: true } } },
        })
      );

      const employeeId = user.employee!.id;
      byPin.set(pinKey, {
        id: employeeId,
        biometricPin: pin,
        employeeCode,
        email,
        userId: user.id,
      });

      created += 1;
    } catch (err) {
      errors.push(
        `PIN ${pin}: ${err instanceof Error ? err.message : "import failed"}`
      );
    }
  }

  if (created > 0 || updated > 0) {
    const devices = await withPrismaRetry(() =>
      prisma.attendanceDevice.findMany({
        where: { companyId: options.companyId, isActive: true },
        select: { serialNumber: true },
      })
    );
    for (const device of devices) {
      if (!device.serialNumber) continue;
      await replayUnprocessedPunches(device.serialNumber);
    }
    scheduleLiveDevicePulls();
    broadcastAppEvent("attendance_updated", {
      action: "device_employee_import",
      created,
      updated,
    });
  }

  return { created, updated, skipped, errors };
}
