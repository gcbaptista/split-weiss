import type { User, Group, GroupMember, Expense, ExpenseSplit, Settlement, ExchangeRateCache, GroupRole, SplitMode } from "@prisma/client";

export type { User, Group, GroupMember, Expense, ExpenseSplit, Settlement, ExchangeRateCache, GroupRole, SplitMode };

export type UserSummary = Pick<User, "id" | "name" | "email">;

export type GroupMemberWithUser = Pick<GroupMember, "userId"> & {
  user: UserSummary;
};

export type GroupWithMembers = Pick<
  Group,
  "id" | "name" | "emoji" | "currency" | "passwordHash"
> & {
  members: GroupMemberWithUser[];
};

export interface ExpenseWithSplits extends Expense {
  splits: (ExpenseSplit & { user: UserSummary })[];
  payer: UserSummary;
}

// Client-safe version with Decimal converted to string
export interface ExpenseWithSplitsClient extends Omit<Expense, 'amount'> {
  amount: string;
  splits: (Omit<ExpenseSplit, 'amount' | 'percentage'> & {
    amount: string;
    percentage: string | null;
    user: UserSummary;
  })[];
  payer: UserSummary;
}

export interface SettlementWithUsers extends Settlement {
  fromUser: UserSummary;
  toUser: UserSummary;
}

// Client-safe version with Decimal converted to string
export interface SettlementWithUsersClient extends Omit<Settlement, 'amount'> {
  amount: string;
  fromUser: UserSummary;
  toUser: UserSummary;
}

export interface SettlementHistoryClient
  extends Pick<Settlement, "id" | "currency" | "date" | "fromUserId" | "toUserId" | "note"> {
  amount: string;
}

export interface ExpenseBreakdownClient
  extends Pick<Expense, "id" | "title" | "currency" | "date" | "payerId"> {
  amount: string;
  payer: UserSummary;
  splits: Array<
    Pick<ExpenseSplit, "userId"> & {
      amount: string;
    }
  >;
}

export interface SettlementBreakdownClient
  extends Pick<Settlement, "id" | "currency" | "date" | "fromUserId" | "toUserId"> {
  amount: string;
  fromUser: UserSummary;
  toUser: UserSummary;
}
