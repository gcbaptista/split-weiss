export type ActionResult<T = void> =
  | { data: T; error?: never }
  | { data?: never; error: string };

export interface BalanceEntry {
  userId: string;
  userName: string;
  netAmount: string;
  currency: string;
}

export interface DebtEntry {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: string;
  currency: string;
}
