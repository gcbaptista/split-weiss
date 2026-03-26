"use client";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { convert } from "@/lib/currency/converter";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { ExchangeRates } from "@/types/currency";
import type {
  ExpenseBreakdownClient,
  MemberSummary,
  SettlementBreakdownClient,
} from "@/types/database";

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
  members: MemberSummary[];
  expenses: ExpenseBreakdownClient[];
  settlements: SettlementBreakdownClient[];
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
  expense?: ExpenseBreakdownClient;
  settlement?: SettlementBreakdownClient;
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
  const t = useTranslations("balances");
  const tc = useTranslations("common");
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

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
    const dateStr = date.toISOString().slice(0, 10);
    return (
      ratesByDate[dateStr] ?? ratesByDate["latest"] ?? { base: currency, date: "latest", rates: {} }
    );
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
    <div className="space-y-3">
      {/* Grand total line */}
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-sm font-semibold text-muted-foreground">{t("groupTotal")}</span>
        <span className="font-bold tabular-nums">{formatCurrency(grandTotal, currency)}</span>
      </div>

      {/* Member cards */}
      <ul className="space-y-2">
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
            <li
              key={member.id}
              className={cn(
                "rounded-lg border bg-card overflow-hidden",
                isHighlightedUser && "border-primary/30 bg-primary/5"
              )}
            >
              {/* Card header: name + paid/share + balance */}
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "font-medium text-sm truncate",
                      isHighlightedUser && "text-primary"
                    )}
                  >
                    {isHighlightedUser ? tc("you") : member.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("paidAndShare", {
                      paid: formatCurrency(spend?.paid ?? "0", currency),
                      share: formatCurrency(spend?.share ?? "0", currency),
                    })}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-base font-semibold tabular-nums shrink-0",
                    netValue > 0 && "text-green-600 dark:text-green-400",
                    netValue < 0 && "text-red-600 dark:text-red-400"
                  )}
                >
                  {netValue > 0 && "+"}
                  {formatCurrency(netAmount, currency)}
                </span>
              </div>

              {/* Expandable toggle + transaction list */}
              {transactionCount > 0 && (
                <>
                  <button
                    onClick={() => toggleMember(member.id)}
                    className="w-full flex items-center gap-2 px-4 py-2 border-t bg-muted/20 hover:bg-muted/40 transition-colors text-xs text-muted-foreground"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    {tc("transaction", { count: transactionCount })}
                  </button>

                  {isExpanded && (
                    <div className="divide-y border-t">
                      {transactions.map((tx) => {
                        if (tx.type === "expense" && tx.expense) {
                          const expense = tx.expense;
                          const memberSplit = expense.splits.find((s) => s.userId === member.id);
                          const memberShare = memberSplit?.amount ?? "0";
                          const isPayer = expense.payerId === member.id;
                          const payerName = isPayer ? null : expense.payer.name;

                          return (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between gap-3 px-4 py-3 pl-9 bg-muted/10"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{expense.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(expense.date)}
                                  {!isPayer && payerName && (
                                    <span>
                                      {" · "}{t("paidBy", { name: payerName })}
                                    </span>
                                  )}
                                  {isPayer && (
                                    <span>
                                      {" · "}{t("paidTotal", { amount: formatCurrency(expense.amount, expense.currency) })}
                                    </span>
                                  )}
                                  <span>
                                    {" · "}{t("shareOf", { amount: formatCurrency(memberShare, expense.currency) })}
                                  </span>
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "text-sm font-medium tabular-nums shrink-0",
                                  tx.runningBalance > 0.005 && "text-green-600 dark:text-green-400",
                                  tx.runningBalance < -0.005 && "text-red-600 dark:text-red-400"
                                )}
                              >
                                {tx.runningBalance > 0.005 && "+"}
                                {formatCurrency(tx.runningBalance.toFixed(2), currency)}
                              </span>
                            </div>
                          );
                        }

                        if (tx.type === "settlement" && tx.settlement) {
                          const settlement = tx.settlement;
                          const isPayer = settlement.fromUserId === member.id;
                          const otherUser = isPayer ? settlement.toUser : settlement.fromUser;

                          return (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between gap-3 px-4 py-3 pl-9 bg-muted/10"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {isPayer ? t("settlementTo", { name: otherUser.name }) : t("settlementFrom", { name: otherUser.name })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(settlement.date)}
                                  <span>
                                    {" · "}
                                    {formatCurrency(
                                      settlement.amount.toString(),
                                      settlement.currency
                                    )}
                                  </span>
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "text-sm font-medium tabular-nums shrink-0",
                                  tx.runningBalance > 0.005 && "text-green-600 dark:text-green-400",
                                  tx.runningBalance < -0.005 && "text-red-600 dark:text-red-400"
                                )}
                              >
                                {tx.runningBalance > 0.005 && "+"}
                                {formatCurrency(tx.runningBalance.toFixed(2), currency)}
                              </span>
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
