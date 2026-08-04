import { redirect } from "next/navigation";
import { requireRoles, unauthorized } from "@/lib/api-auth";
import { slugToProvider, encodeOAuthState } from "@/lib/integrations/providers";
import { getGoogleAuthUrl } from "@/lib/integrations/google/workspace";
import { getZohoAuthUrl } from "@/lib/integrations/zoho/oauth";
import { INTEGRATION_ADMIN_ROLES } from "@/lib/roles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const provider = slugToProvider(slug);
  if (!provider) redirect("/settings/integrations?error=unknown");

  const { session, error } = await requireRoles(INTEGRATION_ADMIN_ROLES);
  if (error || !session) return error ?? unauthorized();

  const state = encodeOAuthState({
    userId: session.id,
    companyId: session.companyId ?? null,
  });

  let url: string | null = null;
  if (provider === "GOOGLE_WORKSPACE") {
    url = getGoogleAuthUrl(state);
  } else {
    url = getZohoAuthUrl(provider, state);
  }

  if (!url) redirect(`/settings/integrations?error=not-configured&provider=${slug}`);
  redirect(url);
}
