import { prisma } from "@/lib/prisma";
import {
  DEFAULT_CURRENCY,
  PLATFORM_SETTINGS_ID,
  isSupportedCurrency,
} from "@/lib/currency";

export async function getAppCurrencyCode(): Promise<string> {
  const row = await prisma.platformSettings.upsert({
    where: { id: PLATFORM_SETTINGS_ID },
    create: {
      id: PLATFORM_SETTINGS_ID,
      currencyCode: DEFAULT_CURRENCY,
    },
    update: {},
    select: { currencyCode: true },
  });
  const code = row.currencyCode?.toUpperCase() || DEFAULT_CURRENCY;
  return isSupportedCurrency(code) ? code : DEFAULT_CURRENCY;
}

export async function setAppCurrencyCode(
  currencyCode: string,
  updatedById?: string | null
): Promise<string> {
  const code = currencyCode.toUpperCase();
  if (!isSupportedCurrency(code)) {
    throw new Error("Unsupported currency");
  }
  const row = await prisma.platformSettings.upsert({
    where: { id: PLATFORM_SETTINGS_ID },
    create: {
      id: PLATFORM_SETTINGS_ID,
      currencyCode: code,
      updatedById: updatedById ?? null,
    },
    update: {
      currencyCode: code,
      updatedById: updatedById ?? null,
    },
    select: { currencyCode: true },
  });
  return row.currencyCode;
}
