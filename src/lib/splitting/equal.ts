import Decimal from "decimal.js";
import type { SplitResult } from "./index";

export function calculateEqual(
  total: Decimal | string,
  userIds: string[]
): SplitResult[] {
  const t = new Decimal(total);
  if (userIds.length === 0) return [];
  const base = t
    .div(userIds.length)
    .toDecimalPlaces(4, Decimal.ROUND_DOWN);
  const remainder = t.minus(base.mul(userIds.length));
  const pennies = remainder
    .div("0.0001")
    .toDecimalPlaces(0)
    .toNumber();
  return userIds.map((userId, i) => ({
    userId,
    amount: i < pennies ? base.plus("0.0001") : base,
    isLocked: false,
  }));
}
