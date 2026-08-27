import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { slugToProvider, decodeOAuthState } from "@/lib/integrations/providers";
import { exchangeGoogleCode } from "@/lib/integrations/google/workspace";
import { exchangeZohoCode } from "@/lib/integrations/zoho/oauth";
import { runIntegrationSync } from "@/lib/integrations/sync";
import type { IntegrationProvider } from "@/lib/integrations/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const stateRaw = request.nextUrl.searchParams.get("state");
  const state = stateRaw ? decodeOAuthState(stateRaw) : null;

  let provider = slugToProvider(slug);
  if (!provider && slug === "zoho") {
    provider = (state?.provider as IntegrationProvider | undefined) ?? null;
  }
  if (!provider) redirect("/settings/integrations?error=unknown");

  if (error || !code) {
    redirect(`/settings/integrations?error=denied&provider=${slug}`);
  }

  const companyId = state?.companyId ?? null;
  const connectedSlug =
    slug === "zoho" && state?.provider
      ? state.provider.toLowerCase().replace(/_/g, "-")
      : slug;

  try {
    if (provider === "GOOGLE_WORKSPACE") {
      await exchangeGoogleCode(code!, companyId);
    } else {
      await exchangeZohoCode(provider, code!, companyId, {
        location: request.nextUrl.searchParams.get("location"),
        accountsServer: request.nextUrl.searchParams.get("accounts-server"),
      });
    }

    await runIntegrationSync(provider, companyId).catch(() => undefined);
    redirect(`/settings/integrations?connected=${connectedSlug}`);
  } catch (err) {
    const digest =
      typeof err === "object" && err && "digest" in err
        ? String((err as { digest?: string }).digest)
        : "";
    if (digest.startsWith("NEXT_REDIRECT")) throw err;
    redirect(`/settings/integrations?error=exchange&provider=${connectedSlug}`);
  }
}
