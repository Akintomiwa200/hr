import { NextRequest, NextResponse } from "next/server";
import { requireSession, unauthorized, forbidden, badRequest } from "@/lib/api-auth";
import { isSuperAdmin } from "@/lib/roles";
import {
  APP_CURRENCIES,
  getCurrencyMeta,
  isSupportedCurrency,
} from "@/lib/currency";
import {
  getAppCurrencyCode,
  setAppCurrencyCode,
} from "@/lib/currency-server";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const currencyCode = await getAppCurrencyCode();
  return NextResponse.json({
    currencyCode,
    currency: getCurrencyMeta(currencyCode),
    options: isSuperAdmin(session.role) ? APP_CURRENCIES : undefined,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!isSuperAdmin(session.role)) return forbidden();

  const body = await request.json().catch(() => null);
  const currencyCode =
    typeof body?.currencyCode === "string" ? body.currencyCode.trim() : "";

  if (!currencyCode || !isSupportedCurrency(currencyCode)) {
    return badRequest("Choose a supported currency denomination.");
  }

  const saved = await setAppCurrencyCode(currencyCode, session.id);
  broadcastAppEvent("settings_updated", { currencyCode: saved });

  return NextResponse.json({
    currencyCode: saved,
    currency: getCurrencyMeta(saved),
  });
}
