import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/password-reset";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json().catch(() => ({}));
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const result = await requestPasswordReset(email);

    // Always return success to avoid revealing whether an account exists.
    // The email delivery status is included in dev for local testing.
    if (result.emailResult.sent === false && result.emailResult.error) {
      // Still 200 to prevent enumeration; log only for insight.
      console.warn("[forgot-password] reset email not sent:", result.emailResult.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
