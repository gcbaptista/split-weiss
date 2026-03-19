import type { ExpenseStateSnapshot } from "@/types/audit";

export function buildStateSnapshot(
  expense: {
    title: string;
    amount: { toString(): string };
    currency: string;
    splitMode: string;
    date: Date;
    payerId: string;
    payer: { name: string | null; email: string };
  },
  splits: Array<{
    userId: string;
    amount: { toString(): string };
    percentage: { toString(): string } | null;
    isLocked: boolean;
    user: { name: string | null; email: string };
  }>
): ExpenseStateSnapshot {
  return {
    title: expense.title,
    amount: expense.amount.toString(),
    currency: expense.currency,
    splitMode: expense.splitMode as ExpenseStateSnapshot["splitMode"],
    date: expense.date.toISOString(),
    payerId: expense.payerId,
    payerName: expense.payer.name ?? expense.payer.email,
    splits: splits.map((s) => ({
      userId: s.userId,
      userName: s.user.name ?? s.user.email,
      amount: s.amount.toString(),
      percentage: s.percentage?.toString() ?? null,
      isLocked: s.isLocked,
    })),
  };
}
