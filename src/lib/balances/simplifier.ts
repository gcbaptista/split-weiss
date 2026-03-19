import Decimal from "decimal.js";
import type { NetBalance } from "./calculator";

export interface SimplifiedDebt {
  fromUserId: string;
  toUserId: string;
  amount: Decimal;
}

/**
 * Greedy min/max algorithm that reduces N*(N-1)/2 debts to ≤ N-1 transactions.
 */
export function simplifyDebts(
  balances: Map<string, NetBalance>
): SimplifiedDebt[] {
  const creditors: { userId: string; amount: Decimal }[] = [];
  const debtors: { userId: string; amount: Decimal }[] = [];

  for (const [userId, bal] of balances) {
    if (bal.netAmount.greaterThan("0.005")) {
      creditors.push({ userId, amount: bal.netAmount });
    } else if (bal.netAmount.lessThan("-0.005")) {
      debtors.push({ userId, amount: bal.netAmount.negated() });
    }
  }

  // Sort descending by amount
  creditors.sort((a, b) => b.amount.comparedTo(a.amount));
  debtors.sort((a, b) => b.amount.comparedTo(a.amount));

  const debts: SimplifiedDebt[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amt = Decimal.min(c.amount, d.amount);

    debts.push({ fromUserId: d.userId, toUserId: c.userId, amount: amt });

    c.amount = c.amount.minus(amt);
    d.amount = d.amount.minus(amt);

    if (c.amount.lessThanOrEqualTo("0.005")) ci++;
    if (d.amount.lessThanOrEqualTo("0.005")) di++;
  }

  return debts;
}
