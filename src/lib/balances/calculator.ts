import Decimal from "decimal.js";
import { convert } from "@/lib/currency/converter";
import type { ExchangeRates } from "@/types/currency";
import type { SettlementWithUsers } from "@/types/database";

interface ExpenseInput {
  date: Date;
  currency: string;
  amount: { toString(): string };
  payerId: string;
  splits: { userId: string; amount: { toString(): string } }[];
}

export interface NetBalance {
  userId: string;
  netAmount: Decimal;
}

export function calculateBalances(
  expenses: ExpenseInput[],
  settlements: SettlementWithUsers[],
  groupCurrency: string,
  ratesByDate: Map<string, ExchangeRates>
): Map<string, NetBalance> {
  const balances = new Map<string, NetBalance>();

  function getOrCreate(userId: string): NetBalance {
    if (!balances.has(userId)) {
      balances.set(userId, { userId, netAmount: new Decimal(0) });
    }
    return balances.get(userId)!;
  }

  function getRates(date: Date): ExchangeRates {
    const dateStr = date.toISOString().split("T")[0];
    return (
      ratesByDate.get(dateStr) ??
      ratesByDate.get("latest") ?? {
        base: groupCurrency,
        date: "latest",
        rates: {},
      }
    );
  }

  for (const expense of expenses) {
    const rates = getRates(expense.date);
    // Payer paid the full amount → credit them
    const paidConverted = convert(
      expense.amount.toString(),
      expense.currency,
      groupCurrency,
      rates
    );
    getOrCreate(expense.payerId).netAmount = getOrCreate(
      expense.payerId
    ).netAmount.plus(paidConverted);

    // Each split member owes their share → debit them
    for (const split of expense.splits) {
      const owedConverted = convert(
        split.amount.toString(),
        expense.currency,
        groupCurrency,
        rates
      );
      getOrCreate(split.userId).netAmount = getOrCreate(
        split.userId
      ).netAmount.minus(owedConverted);
    }
  }

  for (const settlement of settlements) {
    const rates = getRates(settlement.date);
    const amtConverted = convert(
      settlement.amount.toString(),
      settlement.currency,
      groupCurrency,
      rates
    );
    // fromUser paid → credit them
    getOrCreate(settlement.fromUserId).netAmount = getOrCreate(
      settlement.fromUserId
    ).netAmount.plus(amtConverted);
    // toUser received → debit them
    getOrCreate(settlement.toUserId).netAmount = getOrCreate(
      settlement.toUserId
    ).netAmount.minus(amtConverted);
  }

  return balances;
}
