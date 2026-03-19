export interface ExpenseSplitSnapshot {
  userId: string;
  userName: string;
  amount: string;
  percentage: string | null;
  isLocked: boolean;
}

export interface ExpenseStateSnapshot {
  title: string;
  amount: string;
  currency: string;
  splitMode: "EQUAL" | "PERCENTAGE" | "LOCK";
  date: string;
  payerId: string;
  payerName: string;
  splits: ExpenseSplitSnapshot[];
}

export type ExpenseSnapshot =
  | { action: "CREATED"; after: ExpenseStateSnapshot }
  | { action: "UPDATED"; before: ExpenseStateSnapshot; after: ExpenseStateSnapshot }
  | { action: "DELETED"; before: ExpenseStateSnapshot };

export interface ExpenseAuditLogEntry {
  id: string;
  originalExpenseId: string;
  expenseId: string | null;
  groupId: string;
  action: "CREATED" | "UPDATED" | "DELETED";
  snapshot: ExpenseSnapshot;
  createdAt: Date;
  actor: { id: string; name: string | null; email: string };
}
