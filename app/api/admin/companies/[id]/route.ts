import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  changeCompanyPlan,
  getCompanySubscription,
  setCompanyLocked,
} from "@/lib/subscription";
import type { SubscriptionPlanId } from "@/lib/subscription-plans";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import type { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    planId?: SubscriptionPlanId;
    subscriptionStatus?: SubscriptionStatus;
    isActive?: boolean;
    isLocked?: boolean;
    billingEmail?: string | null;
    name?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  if (body.planId) {
    await changeCompanyPlan(id, body.planId, {
      billingEmail: body.billingEmail ?? undefined,
      status: body.subscriptionStatus,
    });
  }

  if (body.isLocked !== undefined) {
    await setCompanyLocked(id, body.isLocked);
  }

  const profilePatch = {
    ...(body.name !== undefined ? { name: body.name.trim() } : {}),
    ...(body.email !== undefined ? { email: body.email?.trim() || null } : {}),
    ...(body.phone !== undefined ? { phone: body.phone?.trim() || null } : {}),
    ...(body.address !== undefined ? { address: body.address?.trim() || null } : {}),
    ...(body.subscriptionStatus ? { subscriptionStatus: body.subscriptionStatus } : {}),
    ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    ...(body.billingEmail !== undefined
      ? { billingEmail: body.billingEmail?.trim() || null }
      : {}),
  };

  if (Object.keys(profilePatch).length > 0) {
    if ("name" in profilePatch && !profilePatch.name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }
    await prisma.company.update({
      where: { id },
      data: profilePatch,
    });
  }

  broadcastAppEvent("subscription_updated", { companyId: id, planId: body.planId });
  broadcastAppEvent("settings_updated", { companyId: id, source: "company_admin_patch" });

  const subscription = await getCompanySubscription(id);
  const updated = await prisma.company.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json({ subscription, company: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.department.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.branch.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.job.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.integration.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.announcement.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.holiday.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.attendanceDevice.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.payrollRun.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.roleDefinition.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.note.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.supportTicket.deleteMany({ where: { companyId: id } });
      await tx.bulkMessage.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.loan.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.auditLog.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.document.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.documentFolder.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.checklistTemplate.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.checklistInstance.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.portalTemplate.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.portalDocument.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.kpiDefinition.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.appraisalCycle.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.recruitmentStage.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.recruitmentTag.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.recruitmentSource.updateMany({ where: { companyId: id }, data: { companyId: null } });
      await tx.recruitmentEmailTemplate.updateMany({
        where: { companyId: id },
        data: { companyId: null },
      });
      await tx.payrollDeduction.updateMany({
        where: { companyId: id },
        data: { companyId: null },
      });

      await tx.payrollSettings.deleteMany({ where: { companyId: id } });
      await tx.attendanceSettings.deleteMany({ where: { companyId: id } });
      await tx.offboardingSettings.deleteMany({ where: { companyId: id } });
      await tx.performanceSettings.deleteMany({ where: { companyId: id } });
      await tx.leaveSettings.deleteMany({ where: { companyId: id } });
      await tx.leaveAllocation.deleteMany({ where: { companyId: id } });
      await tx.attendanceArchive.deleteMany({ where: { companyId: id } });

      await tx.company.delete({ where: { id } });
    });
  } catch (error) {
    console.error("Failed to delete company", error);
    return NextResponse.json(
      {
        error:
          "Could not delete this company because related records are still linked. Deactivate it instead.",
      },
      { status: 409 }
    );
  }

  broadcastAppEvent("subscription_updated", { companyId: id, deleted: true });
  broadcastAppEvent("dashboard_updated", { companyId: id, deleted: true });

  return NextResponse.json({ ok: true, id, name: company.name });
}
