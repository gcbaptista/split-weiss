import Decimal from "decimal.js";

import type { SplitInput, SplitResult } from "./index";
import { seededShuffle } from "./index";

export function calculatePercentage(total: Decimal | string, inputs: SplitInput[]): SplitResult[] {
  const t = new Decimal(total);
  const results = inputs.map((inp) => ({
    userId: inp.userId,
    amount: t
      .mul(new Decimal(inp.percentage ?? "0").div(100))
      .toDecimalPlaces(2, Decimal.ROUND_DOWN),
    isLocked: false,
  }));
  const sum = results.reduce((s, r) => s.plus(r.amount), new Decimal(0));
  const remainder = t.minus(sum);
  const pennies = remainder.div("0.01").toDecimalPlaces(0).toNumber();

  // Deterministically distribute remainder pennies
  const seed = `${t.toString()}:${inputs.map((i) => `${i.userId}:${i.percentage}`).join(",")}`;
  const shuffled = seededShuffle(
    results.map((_, i) => i),
    seed
  );
  for (let i = 0; i < pennies; i++) {
    // Non-null: modulo guarantees index is in-bounds; results and shuffled have the same length
    const idx = shuffled[i % shuffled.length]!;
    results[idx]!.amount = results[idx]!.amount.plus("0.01");
  }
  return results;
}
