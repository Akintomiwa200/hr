import { NextResponse } from "next/server";
import { requireRoles, unauthorized } from "@/lib/api-auth";
import { slugToProvider } from "@/lib/integrations/providers";
import { runIntegrationSync } from "@/lib/integrations/sync";
import { INTEGRATION_ADMIN_ROLES } from "@/lib/roles";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const provider = slugToProvider(slug);
  if (!provider) {
    return NextResponse.json({ error: "Unknown integration" }, { status: 404 });
  }

  const { session, error } = await requireRoles(INTEGRATION_ADMIN_ROLES);
  if (error || !session) return error ?? unauthorized();

  try {
    const result = await runIntegrationSync(provider, session.companyId ?? null);
    broadcastAppEvent("integration_sync", { provider });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
