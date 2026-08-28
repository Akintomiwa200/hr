import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { getGoogleAuthUrl, isGoogleConfigured } from "@/lib/google-calendar";
import { isHr, requireSession } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) redirect("/recruitment");

  if (!isGoogleConfigured()) {
    redirect("/recruitment?google=not-configured");
  }

  const url = getGoogleAuthUrl({ request });
  if (!url) redirect("/recruitment?google=error");
  redirect(url);
}
