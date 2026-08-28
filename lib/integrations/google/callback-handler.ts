import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { exchangeGoogleCode } from "@/lib/google-calendar";
import { decodeOAuthState } from "@/lib/integrations/providers";

export async function handleGoogleOAuthCallback(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const stateRaw = request.nextUrl.searchParams.get("state");
  const state = stateRaw ? decodeOAuthState(stateRaw) : null;

  if (error || !code) {
    redirect("/settings/integrations?error=denied&provider=google-workspace");
  }

  try {
    await exchangeGoogleCode(code, { request });
    redirect(
      state?.companyId
        ? "/settings/integrations?connected=google-workspace"
        : "/recruitment?google=connected"
    );
  } catch (err) {
    const digest =
      typeof err === "object" && err && "digest" in err
        ? String((err as { digest?: string }).digest)
        : "";
    if (digest.startsWith("NEXT_REDIRECT")) throw err;
    redirect("/settings/integrations?error=exchange&provider=google-workspace");
  }
}
