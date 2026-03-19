import type { User, Group, GroupMember, Expense, ExpenseSplit, Settlement, ExchangeRateCache, GroupRole, SplitMode } from "@prisma/client";

export type { User, Group, GroupMember, Expense, ExpenseSplit, Settlement, ExchangeRateCache, GroupRole, SplitMode };

export interface GroupWithMembers extends Group {
  members: (GroupMember & { user: User })[];
}

export interface ExpenseWithSplits extends Expense {
  splits: (ExpenseSplit & { user: User })[];
  payer: User;
}

// Client-safe version with Decimal converted to string
export interface ExpenseWithSplitsClient extends Omit<Expense, 'amount'> {
  amount: string;
  splits: (Omit<ExpenseSplit, 'amount' | 'percentage'> & {
    amount: string;
    percentage: string | null;
    user: User;
  })[];
  payer: User;
}

export interface SettlementWithUsers extends Settlement {
  fromUser: User;
  toUser: User;
}
