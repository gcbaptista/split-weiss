import type { Group, GroupMember, Expense, ExpenseSplit, Settlement, ExchangeRateCache, SplitMode } from "@prisma/client";

export type { Group, GroupMember, Expense, ExpenseSplit, Settlement, ExchangeRateCache, SplitMode };

export type MemberSummary = Pick<GroupMember, "id" | "name">;

export type GroupWithMembers = Pick<
  Group,
  "id" | "name" | "emoji" | "currency" | "passwordHash"
> & {
  members: MemberSummary[];
};

export interface ExpenseWithSplits extends Expense {
  splits: (ExpenseSplit & { user: MemberSummary })[];
  payer: MemberSummary;
}

// Client-safe version with Decimal converted to string
export interface ExpenseWithSplitsClient extends Omit<Expense, 'amount'> {
  amount: string;
  splits: (Omit<ExpenseSplit, 'amount' | 'percentage'> & {
    amount: string;
    percentage: string | null;
    user: MemberSummary;
  })[];
  payer: MemberSummary;
}

export interface SettlementWithUsers extends Settlement {
  fromUser: MemberSummary;
  toUser: MemberSummary;
}

// Client-safe version with Decimal converted to string
export interface SettlementWithUsersClient extends Omit<Settlement, 'amount'> {
  amount: string;
  fromUser: MemberSummary;
  toUser: MemberSummary;
}

export interface SettlementHistoryClient
  extends Pick<Settlement, "id" | "currency" | "date" | "fromUserId" | "toUserId" | "note"> {
  amount: string;
}

export interface ExpenseBreakdownClient
  extends Pick<Expense, "id" | "title" | "currency" | "date" | "payerId"> {
  amount: string;
  payer: MemberSummary;
  splits: Array<
    Pick<ExpenseSplit, "userId"> & {
      amount: string;
    }
  >;
}

export interface SettlementBreakdownClient
  extends Pick<Settlement, "id" | "currency" | "date" | "fromUserId" | "toUserId"> {
  amount: string;
  fromUser: MemberSummary;
  toUser: MemberSummary;
}
