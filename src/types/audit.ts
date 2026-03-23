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

/** A single field change: what it was → what it became */
export interface FieldChange<T = string> {
  from: T;
  to: T;
}

/** Delta for an UPDATE: only the fields that actually changed */
export interface ExpenseDelta {
  title?: FieldChange;
  amount?: FieldChange;
  currency?: FieldChange;
  splitMode?: FieldChange;
  date?: FieldChange;
  payerName?: FieldChange;
  /** If splits changed at all, store old and new arrays in full */
  splits?: FieldChange<ExpenseSplitSnapshot[]>;
}

export type ExpenseSnapshot =
  | { action: "CREATED" }
  | { action: "UPDATED"; delta: ExpenseDelta }
  | { action: "DELETED"; state: ExpenseStateSnapshot };

export interface ExpenseAuditLogEntry {
  id: string;
  originalExpenseId: string;
  expenseId: string | null;
  groupId: string;
  action: "CREATED" | "UPDATED" | "DELETED";
  snapshot: ExpenseSnapshot;
  createdAt: Date;
  actor: { id: string; name: string };
}
