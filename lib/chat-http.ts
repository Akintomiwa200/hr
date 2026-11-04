import { NextResponse } from "next/server";
import { ChatError } from "@/lib/chat";

/** Turn a domain chat error into a safe API response. */
export function chatErrorResponse(error: unknown) {
  if (error instanceof ChatError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[chat]", error);
  return NextResponse.json(
    { error: "Chat is unavailable right now. Please try again." },
    { status: 500 }
  );
}
