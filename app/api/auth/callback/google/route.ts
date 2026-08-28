import { NextRequest } from "next/server";
import { handleGoogleOAuthCallback } from "@/lib/integrations/google/callback-handler";

/** Legacy path some Google OAuth clients register (NextAuth-style). */
export async function GET(request: NextRequest) {
  return handleGoogleOAuthCallback(request);
}
