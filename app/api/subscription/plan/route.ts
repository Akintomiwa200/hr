import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/subscription-plans";

/** Plan identity for feature-gating — readable by any logged-in org member. */
export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "No company linked to this account" }, { status: 404 });
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { plan: true, isLocked: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({
    planId: company.plan,
    planName: getPlan(company.plan).name,
    isLocked: company.isLocked,
  });
}