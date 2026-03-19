import Decimal from "decimal.js";
import type { SplitInput, SplitResult } from "./index";

export function calculatePercentage(
  total: Decimal | string,
  inputs: SplitInput[]
): SplitResult[] {
  const t = new Decimal(total);
  const results = inputs.map((inp) => ({
    userId: inp.userId,
    amount: t
      .mul(new Decimal(inp.percentage ?? "0").div(100))
      .toDecimalPlaces(4, Decimal.ROUND_DOWN),
    isLocked: false,
  }));
  const sum = results.reduce((s, r) => s.plus(r.amount), new Decimal(0));
  const remainder = t.minus(sum);
  const pennies = remainder
    .div("0.0001")
    .toDecimalPlaces(0)
    .toNumber();
  for (let i = 0; i < Math.abs(pennies); i++) {
    const idx = i % results.length;
    if (pennies > 0) {
      results[idx].amount = results[idx].amount.plus("0.0001");
    } else {
      results[idx].amount = results[idx].amount.minus("0.0001");
    }
  }
  return results;
}
