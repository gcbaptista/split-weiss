import Decimal from "decimal.js";
import type { ExchangeRates } from "@/types/currency";

export function convert(
  amount: Decimal | string | number,
  from: string,
  to: string,
  rates: ExchangeRates
): Decimal {
  if (from === to) return new Decimal(amount);
  const base = rates.base;
  const r = rates.rates;
  // All rates are relative to base currency
  const fromRate =
    from === base ? new Decimal(1) : new Decimal(r[from] ?? 1);
  const toRate =
    to === base ? new Decimal(1) : new Decimal(r[to] ?? 1);
  // Triangulate: amount / fromRate * toRate
  return new Decimal(amount).div(fromRate).mul(toRate);
}
