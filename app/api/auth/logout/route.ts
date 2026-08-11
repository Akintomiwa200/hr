import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { getAppUrlFromRequest } from "@/lib/app-url";

export async function POST(request: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", getAppUrlFromRequest(request)));
}
