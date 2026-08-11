import { NextRequest, NextResponse } from "next/server";
import { buildApiCatalog } from "@/lib/api-catalog";
import { getAppUrlFromRequest } from "@/lib/app-url";

export async function GET(request: NextRequest) {
  const catalog = buildApiCatalog(getAppUrlFromRequest(request));
  return NextResponse.json(catalog);
}
