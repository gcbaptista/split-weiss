import Decimal from "decimal.js";
import type { SplitInput, SplitResult } from "./index";

export function calculateValue(
  total: Decimal | string,
  inputs: SplitInput[]
): SplitResult[] {
  const t = new Decimal(total);
  const results: SplitResult[] = inputs.map((inp) => ({
    userId: inp.userId,
    amount: new Decimal(inp.amount ?? "0"),
    isLocked: false,
  }));
  const sum = results.reduce((s, r) => s.plus(r.amount), new Decimal(0));
  if (!sum.toDecimalPlaces(2).equals(t.toDecimalPlaces(2))) {
    throw new Error(
      `Split amounts (${sum.toFixed(2)}) do not equal total (${t.toFixed(2)})`
    );
  }
  return results;
}
