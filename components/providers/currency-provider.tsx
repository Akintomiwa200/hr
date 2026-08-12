"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  DEFAULT_CURRENCY,
  formatMoney,
  getCurrencyMeta,
  type AppCurrency,
} from "@/lib/currency";

type CurrencyContextValue = {
  currencyCode: string;
  currency: AppCurrency;
  formatCurrency: (amount: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue>({
  currencyCode: DEFAULT_CURRENCY,
  currency: getCurrencyMeta(DEFAULT_CURRENCY),
  formatCurrency: (amount: number) => formatMoney(amount, DEFAULT_CURRENCY),
});

export function CurrencyProvider({
  currencyCode,
  children,
}: {
  currencyCode: string;
  children: ReactNode;
}) {
  const code = currencyCode || DEFAULT_CURRENCY;
  const currency = useMemo(() => getCurrencyMeta(code), [code]);
  const formatCurrency = useCallback(
    (amount: number) => formatMoney(amount, code),
    [code]
  );

  const value = useMemo(
    () => ({ currencyCode: code, currency, formatCurrency }),
    [code, currency, formatCurrency]
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function useFormatCurrency() {
  return useCurrency().formatCurrency;
}
