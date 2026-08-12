"use client";

import { useFormatCurrency } from "@/components/providers/currency-provider";

/** Renders an amount in the platform currency (default Naira). */
export function Money({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  const formatCurrency = useFormatCurrency();
  return <span className={className}>{formatCurrency(amount)}</span>;
}
