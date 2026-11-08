import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { getAppUrl } from "@/lib/app-url";

export async function POST() {
  await destroySession();
  // Always return to the canonical sign-in page, never the current host/path.
  return NextResponse.redirect(new URL("/login", getAppUrl()));
}
