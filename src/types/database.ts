import type {
  ExchangeRateCache,
  Expense,
  ExpenseSplit,
  Group,
  GroupMember,
  Settlement,
  SplitMode,
} from "@prisma/client";

export type { ExchangeRateCache, Expense, ExpenseSplit, Group, GroupMember, Settlement, SplitMode };

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
export interface ExpenseWithSplitsClient extends Omit<Expense, "amount"> {
  amount: string;
  splits: (Omit<ExpenseSplit, "amount" | "percentage"> & {
    amount: string;
    percentage: string | null;
    user: MemberSummary;
  })[];
  payer: MemberSummary;
}

export interface SettlementHistoryClient extends Pick<
  Settlement,
  "id" | "currency" | "date" | "fromUserId" | "toUserId" | "note"
> {
  amount: string;
}

export interface ExpenseBreakdownClient extends Pick<
  Expense,
  "id" | "title" | "currency" | "date" | "payerId"
> {
  amount: string;
  payer: MemberSummary;
  splits: Array<
    Pick<ExpenseSplit, "userId"> & {
      amount: string;
    }
  >;
}

export interface SettlementBreakdownClient extends Pick<
  Settlement,
  "id" | "currency" | "date" | "fromUserId" | "toUserId"
> {
  amount: string;
  fromUser: MemberSummary;
  toUser: MemberSummary;
}
