import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { exchangeGoogleCode } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    redirect("/recruitment?google=denied");
  }

  try {
    await exchangeGoogleCode(code);
    redirect("/recruitment?google=connected");
  } catch {
    redirect("/recruitment?google=error");
  }
}
