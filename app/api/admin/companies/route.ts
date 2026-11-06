import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { requestPasswordReset } from "@/lib/password-reset";

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== Role.SUPER_ADMIN || session.platformContext) {
    return NextResponse.json({ error: "Platform administrator access required." }, { status: 403 });
  }

  let body: { name?: unknown; slug?: unknown; email?: unknown; billingEmail?: unknown; adminEmail?: unknown };
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    body = parsed as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slugInput = typeof body.slug === "string" ? body.slug.trim() : "";
  const slug = slugify(slugInput || name);
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const billingEmail = typeof body.billingEmail === "string" ? body.billingEmail.trim() : "";
  const adminEmail = typeof body.adminEmail === "string" ? body.adminEmail.trim().toLowerCase() : "";

  if (!name) return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  if (!slug) return NextResponse.json({ error: "Enter a company name that can form a URL slug." }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid company email." }, { status: 400 });
  }
  if (billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) {
    return NextResponse.json({ error: "Enter a valid billing email." }, { status: 400 });
  }
  if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    return NextResponse.json({ error: "Enter a valid first administrator email." }, { status: 400 });
  }

  if (adminEmail && await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } })) {
    return NextResponse.json({ error: "That administrator email already belongs to an account." }, { status: 409 });
  }

  try {
    const company = await prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: {
          name,
          slug,
          email: email || null,
          billingEmail: billingEmail || null,
        },
      });
      if (adminEmail) {
        const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
        await tx.user.create({
          data: {
            email: adminEmail,
            passwordHash,
            role: Role.COMPANY_ADMIN,
            companyId: created.id,
          },
        });
      }
      return tx.company.findUniqueOrThrow({
        where: { id: created.id },
        include: { _count: { select: { users: true } } },
      });
    });
    let adminInviteSent: boolean | null = null;
    if (adminEmail) {
      try {
        const invite = await requestPasswordReset(adminEmail);
        adminInviteSent = invite.emailResult.sent;
      } catch {
        adminInviteSent = false;
      }
    }
    await audit({
      actor: session,
      module: "platform-tenants",
      action: "CREATE",
      entityId: company.id,
      entityLabel: company.name,
      meta: { slug: company.slug, firstAdminEmail: adminEmail || null },
    });
    broadcastAppEvent("subscription_updated", { companyId: company.id, action: "created" });
    broadcastAppEvent("dashboard_updated", { companyId: company.id, action: "created" });
    return NextResponse.json({ company, adminInviteSent }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "That company URL is already in use. Choose another slug." }, { status: 409 });
    }
    console.error("[admin/companies] create failed", error);
    return NextResponse.json({ error: "Could not create company." }, { status: 500 });
  }
}
