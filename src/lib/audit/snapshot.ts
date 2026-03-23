import type { ExpenseDelta, ExpenseSplitSnapshot, ExpenseStateSnapshot } from "@/types/audit";

interface ExpenseInput {
  title: string;
  amount: { toString(): string };
  currency: string;
  splitMode: string;
  date: Date;
  payerId: string;
  payer: { name: string };
}

interface SplitInput {
  userId: string;
  amount: { toString(): string };
  percentage: { toString(): string } | null;
  isLocked: boolean;
  user: { name: string };
}

function toSplitSnapshots(splits: SplitInput[]): ExpenseSplitSnapshot[] {
  return splits.map((s) => ({
    userId: s.userId,
    userName: s.user.name,
    amount: s.amount.toString(),
    percentage: s.percentage?.toString() ?? null,
    isLocked: s.isLocked,
  }));
}

/** Full state snapshot — used only for DELETED entries */
export function buildStateSnapshot(
  expense: ExpenseInput,
  splits: SplitInput[]
): ExpenseStateSnapshot {
  return {
    title: expense.title,
    amount: expense.amount.toString(),
    currency: expense.currency,
    splitMode: expense.splitMode as ExpenseStateSnapshot["splitMode"],
    date: expense.date.toISOString(),
    payerId: expense.payerId,
    payerName: expense.payer.name,
    splits: toSplitSnapshots(splits),
  };
}

function splitsEqual(a: ExpenseSplitSnapshot[], b: ExpenseSplitSnapshot[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].userId !== b[i].userId || a[i].amount !== b[i].amount) return false;
  }
  return true;
}

/** Delta between two expense states — used for UPDATED entries */
export function buildDelta(
  before: ExpenseInput,
  beforeSplits: SplitInput[],
  after: ExpenseInput,
  afterSplits: SplitInput[]
): ExpenseDelta {
  const delta: ExpenseDelta = {};

  if (before.title !== after.title) delta.title = { from: before.title, to: after.title };
  if (before.amount.toString() !== after.amount.toString())
    delta.amount = { from: before.amount.toString(), to: after.amount.toString() };
  if (before.currency !== after.currency)
    delta.currency = { from: before.currency, to: after.currency };
  if (before.splitMode !== after.splitMode)
    delta.splitMode = { from: before.splitMode, to: after.splitMode };
  if (before.date.toISOString() !== after.date.toISOString())
    delta.date = { from: before.date.toISOString(), to: after.date.toISOString() };
  if (before.payerId !== after.payerId) {
    delta.payerId = { from: before.payerId, to: after.payerId };
    delta.payerName = { from: before.payer.name, to: after.payer.name };
  }

  const oldSplits = toSplitSnapshots(beforeSplits);
  const newSplits = toSplitSnapshots(afterSplits);
  if (!splitsEqual(oldSplits, newSplits)) delta.splits = { from: oldSplits, to: newSplits };

  return delta;
}
