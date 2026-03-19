import Decimal from "decimal.js";
import type { SplitInput, SplitResult } from "./index";

/**
 * MBway-style lock algorithm:
 * - Locked participants keep their exact amount
 * - Unlocked participants share (total - sum(locked)) equally
 * - Penny correction applied to unlocked group
 */
export function calculateLock(
  total: Decimal | string,
  inputs: SplitInput[]
): SplitResult[] {
  const t = new Decimal(total);
  const locked = inputs.filter((i) => i.isLocked);
  const unlocked = inputs.filter((i) => !i.isLocked);

  const lockedSum = locked.reduce(
    (s, i) => s.plus(new Decimal(i.amount ?? "0")),
    new Decimal(0)
  );

  if (lockedSum.greaterThan(t)) {
    throw new Error(
      `Locked amounts (${lockedSum.toFixed(4)}) exceed total (${t.toFixed(4)})`
    );
  }

  const remaining = t.minus(lockedSum);

  const lockedResults: SplitResult[] = locked.map((i) => ({
    userId: i.userId,
    amount: new Decimal(i.amount ?? "0"),
    isLocked: true,
  }));

  if (unlocked.length === 0) {
    if (!remaining.toDecimalPlaces(4).isZero()) {
      throw new Error("No unlocked participants to distribute remainder");
    }
    return lockedResults;
  }

  const base = remaining
    .div(unlocked.length)
    .toDecimalPlaces(4, Decimal.ROUND_DOWN);
  const rem = remaining.minus(base.mul(unlocked.length));
  const pennies = rem.div("0.0001").toDecimalPlaces(0).toNumber();

  const unlockedResults: SplitResult[] = unlocked.map((inp, i) => ({
    userId: inp.userId,
    amount: i < pennies ? base.plus("0.0001") : base,
    isLocked: false,
  }));

  return [...lockedResults, ...unlockedResults];
}
