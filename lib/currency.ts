import { prisma } from "@/lib/prisma";

export const DEFAULT_CURRENCY = "NGN";
export const PLATFORM_SETTINGS_ID = "platform";

export type AppCurrency = {
  code: string;
  label: string;
  symbol: string;
  locale: string;
};

/** Denominations Super Admin may select for the whole platform. */
export const APP_CURRENCIES: AppCurrency[] = [
  { code: "NGN", label: "Nigerian Naira", symbol: "₦", locale: "en-NG" },
  { code: "USD", label: "US Dollar", symbol: "$", locale: "en-US" },
  { code: "EUR", label: "Euro", symbol: "€", locale: "en-EU" },
  { code: "GBP", label: "British Pound", symbol: "£", locale: "en-GB" },
  { code: "GHS", label: "Ghanaian Cedi", symbol: "GH₵", locale: "en-GH" },
  { code: "KES", label: "Kenyan Shilling", symbol: "KSh", locale: "en-KE" },
  { code: "ZAR", label: "South African Rand", symbol: "R", locale: "en-ZA" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$", locale: "en-CA" },
];

const currencyByCode = new Map(
  APP_CURRENCIES.map((c) => [c.code, c] as const)
);

export function isSupportedCurrency(code: string): boolean {
  return currencyByCode.has(code.toUpperCase());
}

export function getCurrencyMeta(code: string = DEFAULT_CURRENCY): AppCurrency {
  return currencyByCode.get(code.toUpperCase()) ?? currencyByCode.get(DEFAULT_CURRENCY)!;
}

export function formatMoney(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY
): string {
  const meta = getCurrencyMeta(currencyCode);
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: meta.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${meta.symbol}${amount.toLocaleString("en-NG")}`;
  }
}

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
