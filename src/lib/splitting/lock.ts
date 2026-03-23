import Decimal from "decimal.js";

import type { SplitInput, SplitResult } from "./index";
import { seededShuffle } from "./index";

/**
 * MBway-style lock algorithm:
 * - Locked participants keep their exact amount
 * - Unlocked participants share (total - sum(locked)) equally
 * - Penny correction applied to unlocked group
 */
export function calculateLock(total: Decimal | string, inputs: SplitInput[]): SplitResult[] {
  const t = new Decimal(total);
  const locked = inputs.filter((i) => i.isLocked);
  const unlocked = inputs.filter((i) => !i.isLocked);

  const lockedSum = locked.reduce((s, i) => s.plus(new Decimal(i.amount ?? "0")), new Decimal(0));

  if (lockedSum.greaterThan(t)) {
    throw new Error(`Locked amounts (${lockedSum.toFixed(2)}) exceed total (${t.toFixed(2)})`);
  }

  const remaining = t.minus(lockedSum);

  const lockedResults: SplitResult[] = locked.map((i) => ({
    userId: i.userId,
    amount: new Decimal(i.amount ?? "0"),
    isLocked: true,
  }));

  if (unlocked.length === 0) {
    if (!remaining.toDecimalPlaces(2).isZero()) {
      throw new Error("No unlocked participants to distribute remainder");
    }
    return lockedResults;
  }

  const base = remaining.div(unlocked.length).toDecimalPlaces(2, Decimal.ROUND_DOWN);
  const rem = remaining.minus(base.mul(unlocked.length));
  const pennies = rem.div("0.01").toDecimalPlaces(0).toNumber();

  // Deterministically pick which unlocked members get the extra penny
  const seed = `${t.toString()}:${unlocked.map((i) => i.userId).join(",")}`;
  const shuffled = seededShuffle(
    unlocked.map((_, i) => i),
    seed
  );
  const luckySet = new Set(shuffled.slice(0, pennies));

  const unlockedResults: SplitResult[] = unlocked.map((inp, i) => ({
    userId: inp.userId,
    amount: luckySet.has(i) ? base.plus("0.01") : base,
    isLocked: false,
  }));

  return [...lockedResults, ...unlockedResults];
}
