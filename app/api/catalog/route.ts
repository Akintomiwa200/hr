import { NextRequest, NextResponse } from "next/server";
import { buildApiCatalog } from "@/lib/api-catalog";

function baseUrl(request: NextRequest) {
  return (
    process.env.APP_URL?.trim() ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`
  );
}

export async function GET(request: NextRequest) {
  const catalog = buildApiCatalog(baseUrl(request));
  return NextResponse.json(catalog);
}
