import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { getAppUrlFromRequest } from "@/lib/app-url";
import { slugToProvider, decodeOAuthState } from "@/lib/integrations/providers";
import { exchangeGoogleCode } from "@/lib/integrations/google/workspace";
import { exchangeZohoCode } from "@/lib/integrations/zoho/oauth";
import { runIntegrationSync } from "@/lib/integrations/sync";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const provider = slugToProvider(slug);
  if (!provider) redirect("/settings/integrations?error=unknown");

  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const stateRaw = request.nextUrl.searchParams.get("state");
  const appUrl = getAppUrlFromRequest(request);

  if (error || !code) {
    redirect(`/settings/integrations?error=denied&provider=${slug}`);
  }

  const state = stateRaw ? decodeOAuthState(stateRaw) : null;
  const companyId = state?.companyId ?? null;

  try {
    if (provider === "GOOGLE_WORKSPACE") {
      await exchangeGoogleCode(code!, companyId, appUrl);
    } else {
      await exchangeZohoCode(provider, code!, companyId, appUrl);
    }

    await runIntegrationSync(provider, companyId).catch(() => undefined);
    redirect(`/settings/integrations?connected=${slug}`);
  } catch {
    redirect(`/settings/integrations?error=exchange&provider=${slug}`);
  }
}
