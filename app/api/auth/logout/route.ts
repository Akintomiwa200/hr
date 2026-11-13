import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(request: Request) {
  await destroySession();
  // Keep logout on the host the user is currently visiting and switch POST to GET.
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
