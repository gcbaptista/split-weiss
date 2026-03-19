"use client";
import { useState, useMemo } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { convert } from "@/lib/currency/converter";
import type { ExchangeRates } from "@/types/currency";
import type { User, ExpenseWithSplitsClient, SettlementWithUsers } from "@/types/database";

export interface MemberSpend {
  userId: string;
  paid: string;
  share: string;
}

interface SerializableNetBalance {
  userId: string;
  netAmount: string;
}

interface BalanceBreakdownProps {
  balances: SerializableNetBalance[];
  members: User[];
  expenses: ExpenseWithSplitsClient[];
  settlements: SettlementWithUsers[];
  memberSpend: MemberSpend[];
  grandTotal: string;
  currency: string;
  ratesByDate: Record<string, ExchangeRates>;
  highlightedUserId?: string;
}

interface MemberTransaction {
  id: string;
  type: "expense" | "settlement";
  date: Date;
  expense?: ExpenseWithSplitsClient;
  settlement?: SettlementWithUsers;
  impactGroupCurrency: number;
  runningBalance: number;
}

export function BalanceBreakdown({
  balances,
  members,
  expenses,
  settlements,
  memberSpend,
  grandTotal,
  currency,
  ratesByDate,
  highlightedUserId,
}: BalanceBreakdownProps) {
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set(highlightedUserId ? [highlightedUserId] : [])
  );

  const toggleMember = (userId: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const balanceMap = new Map(balances.map((b) => [b.userId, b]));
  const spendMap = new Map(memberSpend.map((s) => [s.userId, s]));

  function getRates(date: Date): ExchangeRates {
    const dateStr = date.toISOString().split("T")[0];
    return ratesByDate[dateStr] ?? ratesByDate["latest"] ?? { base: currency, date: "latest", rates: {} };
  }

  function buildMemberTransactions(memberId: string): MemberTransaction[] {
    const items: Omit<MemberTransaction, "runningBalance">[] = [];

    for (const expense of expenses) {
      const isPayer = expense.payerId === memberId;
      const hasSplit = expense.splits.some((s) => s.userId === memberId);
      if (!isPayer && !hasSplit) continue;

      const rates = getRates(new Date(expense.date));
      const memberSplit = expense.splits.find((s) => s.userId === memberId);
      const paidConverted = isPayer
        ? parseFloat(convert(expense.amount, expense.currency, currency, rates).toString())
        : 0;
      const shareConverted = memberSplit
        ? parseFloat(convert(memberSplit.amount, expense.currency, currency, rates).toString())
        : 0;

      items.push({
        id: `expense-${expense.id}`,
        type: "expense",
        date: new Date(expense.date),
        expense,
        impactGroupCurrency: paidConverted - shareConverted,
      });
    }

    for (const settlement of settlements) {
      const isFrom = settlement.fromUserId === memberId;
      const isTo = settlement.toUserId === memberId;
      if (!isFrom && !isTo) continue;

      const rates = getRates(new Date(settlement.date));
      const amtConverted = parseFloat(
        convert(settlement.amount.toString(), settlement.currency, currency, rates).toString()
      );

      items.push({
        id: `settlement-${settlement.id}`,
        type: "settlement",
        date: new Date(settlement.date),
        settlement,
        impactGroupCurrency: isFrom ? amtConverted : -amtConverted,
      });
    }

    // Sort by date ascending to compute running balance correctly
    items.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Compute running balance (oldest first)
    let running = 0;
    const withBalance = items.map((item) => {
      running += item.impactGroupCurrency;
      return { ...item, runningBalance: running };
    });

    // Reverse so newest transactions appear first
    withBalance.reverse();
    return withBalance;
  }

  const sortedMembers = [...members].sort((a, b) => {
    if (highlightedUserId) {
      if (a.id === highlightedUserId) return -1;
      if (b.id === highlightedUserId) return 1;
    }
    const aPaid = parseFloat(spendMap.get(a.id)?.paid ?? "0");
    const bPaid = parseFloat(spendMap.get(b.id)?.paid ?? "0");
    return bPaid - aPaid;
  });

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Grand total header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/40">
        <span className="text-sm font-semibold">Group total</span>
        <span className="font-bold tabular-nums">
          {formatCurrency(grandTotal, currency)}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-2 border-b bg-muted/20">
        <div className="h-4 w-4" />
        <span className="text-xs text-muted-foreground">Member</span>
        <span className="w-16 sm:w-24 text-right text-xs text-muted-foreground hidden sm:block">Paid</span>
        <span className="w-16 sm:w-24 text-right text-xs text-muted-foreground hidden sm:block">Share</span>
        <span className="w-16 sm:w-24 text-right text-xs text-muted-foreground">Balance</span>
      </div>

      {/* Member breakdown */}
      <div className="divide-y">
        {sortedMembers.map((member) => {
          const balance = balanceMap.get(member.id);
          const spend = spendMap.get(member.id);
          const isExpanded = expandedMembers.has(member.id);
          const isHighlightedUser = member.id === highlightedUserId;

          const transactions = buildMemberTransactions(member.id);
          const transactionCount = transactions.length;
          const netAmount = balance?.netAmount ?? "0";
          const netValue = parseFloat(netAmount);

          return (
            <div
              key={member.id}
              className={cn(
                "overflow-hidden",
                isHighlightedUser && "bg-primary/5"
              )}
            >
              {/* Member header */}
              <button
                onClick={() => toggleMember(member.id)}
                className="w-full hover:bg-muted/50 transition-colors"
              >
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-3">
                  <div className="shrink-0">
                    {transactionCount > 0 ? (
                      isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0 text-left">
                    <p
                      className={cn(
                        "font-medium truncate text-sm",
                        isHighlightedUser && "text-primary"
                      )}
                    >
                      {isHighlightedUser ? "You" : member.name ?? member.email}
                    </p>
                    {transactionCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {transactionCount} transaction{transactionCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {/* Paid */}
                  <div className="w-16 sm:w-24 text-right hidden sm:block">
                    <span className="text-sm tabular-nums">
                      {formatCurrency(spend?.paid ?? "0", currency)}
                    </span>
                  </div>

                  {/* Share */}
                  <div className="w-16 sm:w-24 text-right hidden sm:block">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {formatCurrency(spend?.share ?? "0", currency)}
                    </span>
                  </div>

                  {/* Balance */}
                  <div className="w-16 sm:w-24 text-right">
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        netValue > 0 && "text-green-600",
                        netValue < 0 && "text-red-600"
                      )}
                    >
                      {netValue > 0 && "+"}
                      {formatCurrency(netAmount, currency)}
                    </span>
                  </div>
                </div>
              </button>

              {/* Expanded transaction list */}
              {isExpanded && transactionCount > 0 && (
                <div className="border-t divide-y bg-muted/20">
                  {transactions.map((tx) => {
                    if (tx.type === "expense" && tx.expense) {
                      const expense = tx.expense;
                      const memberSplit = expense.splits.find(
                        (s) => s.userId === member.id
                      );
                      const memberShare = memberSplit?.amount ?? "0";
                      const isPayer = expense.payerId === member.id;
                      const payerName = isPayer
                        ? null
                        : expense.payer.name ?? expense.payer.email;

                      return (
                        <div
                          key={tx.id}
                          className="px-4 py-3 pl-14 grid grid-cols-[1fr_auto_auto_auto] items-center gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {expense.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(expense.date).toLocaleDateString()}
                              {!isPayer && payerName && (
                                <span className="ml-1">· paid by {payerName}</span>
                              )}
                            </p>
                          </div>
                          {/* Paid */}
                          <div className="w-16 sm:w-24 text-right shrink-0 hidden sm:block">
                            {isPayer ? (
                              <span className="text-sm tabular-nums">
                                {formatCurrency(expense.amount, expense.currency)}
                              </span>
                            ) : (
                              <span className="text-sm tabular-nums text-muted-foreground">—</span>
                            )}
                          </div>
                          {/* Share */}
                          <div className="w-16 sm:w-24 text-right shrink-0 hidden sm:block">
                            <span className="text-sm tabular-nums text-muted-foreground">
                              {formatCurrency(memberShare, expense.currency)}
                            </span>
                          </div>
                          {/* Running Balance */}
                          <div className="w-16 sm:w-24 text-right shrink-0">
                            <span
                              className={cn(
                                "text-sm tabular-nums",
                                tx.runningBalance > 0.005 && "text-green-600",
                                tx.runningBalance < -0.005 && "text-red-600"
                              )}
                            >
                              {tx.runningBalance > 0.005 && "+"}
                              {formatCurrency(tx.runningBalance.toFixed(2), currency)}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (tx.type === "settlement" && tx.settlement) {
                      const settlement = tx.settlement;
                      const isPayer = settlement.fromUserId === member.id;
                      const otherUser = isPayer
                        ? settlement.toUser
                        : settlement.fromUser;

                      return (
                        <div
                          key={tx.id}
                          className="px-4 py-3 pl-14 grid grid-cols-[1fr_auto_auto_auto] items-center gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              Settlement {isPayer ? "to" : "from"}{" "}
                              {otherUser.name ?? otherUser.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(settlement.date).toLocaleDateString()}
                            </p>
                          </div>
                          {/* Empty paid/share columns */}
                          <div className="w-16 sm:w-24 hidden sm:block" />
                          <div className="w-16 sm:w-24 hidden sm:block" />
                          {/* Running Balance */}
                          <div className="w-16 sm:w-24 text-right shrink-0">
                            <span
                              className={cn(
                                "text-sm tabular-nums",
                                tx.runningBalance > 0.005 && "text-green-600",
                                tx.runningBalance < -0.005 && "text-red-600"
                              )}
                            >
                              {tx.runningBalance > 0.005 && "+"}
                              {formatCurrency(tx.runningBalance.toFixed(2), currency)}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
