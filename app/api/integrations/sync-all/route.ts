import { NextResponse } from "next/server";
import { requireRoles, unauthorized } from "@/lib/api-auth";
import { runAllIntegrationSyncs } from "@/lib/integrations/sync";
import { INTEGRATION_ADMIN_ROLES } from "@/lib/roles";

export async function POST() {
  const { session, error } = await requireRoles(INTEGRATION_ADMIN_ROLES);
  if (error || !session) return error ?? unauthorized();

  const results = await runAllIntegrationSyncs(session.companyId ?? null);
  return NextResponse.json({ success: true, results });
}
