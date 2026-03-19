"use client";
import { useState } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { User, ExpenseWithSplitsClient, SettlementWithUsers } from "@/types/database";

interface SerializableNetBalance {
  userId: string;
  netAmount: string;
}

interface BalanceBreakdownProps {
  balances: SerializableNetBalance[];
  members: User[];
  expenses: ExpenseWithSplitsClient[];
  settlements: SettlementWithUsers[];
  currency: string;
  highlightedUserId?: string;
}

export function BalanceBreakdown({
  balances,
  members,
  expenses,
  settlements,
  currency,
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

  const sortedMembers = [...members].sort((a, b) => {
    if (highlightedUserId) {
      if (a.id === highlightedUserId) return -1;
      if (b.id === highlightedUserId) return 1;
    }
    const aBalance = parseFloat(balanceMap.get(a.id)?.netAmount ?? "0");
    const bBalance = parseFloat(balanceMap.get(b.id)?.netAmount ?? "0");
    return bBalance - aBalance;
  });

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Member breakdown */}
      <div className="divide-y">
        {sortedMembers.map((member) => {
          const balance = balanceMap.get(member.id);
          const isExpanded = expandedMembers.has(member.id);
          const isHighlightedUser = member.id === highlightedUserId;

          // Expenses where this member participated.
          const memberExpenses = expenses.filter((e) =>
            e.splits.some((s) => s.userId === member.id)
          );

          // Settlements where this member paid or received money.
          const memberSettlements = settlements.filter(
            (s) => s.fromUserId === member.id || s.toUserId === member.id
          );

          const transactionCount = memberExpenses.length + memberSettlements.length;
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
              {/* Member header - clickable to expand/collapse */}
              <button
                onClick={() => toggleMember(member.id)}
                className="w-full hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Expand/collapse icon */}
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

                    {/* Member name */}
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
                  </div>

                  {/* Net balance */}
                  <div className="shrink-0 pl-2">
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
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

              {/* Transaction list - shown when expanded */}
              {isExpanded && transactionCount > 0 && (
                <div className="border-t divide-y bg-muted/20">
                  {/* Expenses */}
                  {memberExpenses.map((expense) => {
                    const memberSplit = expense.splits.find(
                      (s) => s.userId === member.id
                    );
                    const memberShare = memberSplit?.amount ?? "0";
                    const isPayer = expense.payerId === member.id;
                    const payerName = isPayer
                      ? null
                      : expense.payer.name ?? expense.payer.email;

                    // Calculate impact: paid - share
                    const paid = isPayer ? parseFloat(expense.amount) : 0;
                    const share = parseFloat(memberShare);
                    const impact = paid - share;

                    return (
                      <div
                        key={`expense-${expense.id}`}
                        className="px-4 py-3 pl-14 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
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
                        <div className="shrink-0">
                          <span
                            className={cn(
                              "text-sm tabular-nums",
                              impact > 0 && "text-green-600",
                              impact < 0 && "text-red-600"
                            )}
                          >
                            {impact > 0 && "+"}
                            {formatCurrency(impact.toFixed(4), expense.currency)}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Settlements */}
                  {memberSettlements.map((settlement) => {
                    const isPayer = settlement.fromUserId === member.id;
                    const otherUser = isPayer
                      ? settlement.toUser
                      : settlement.fromUser;
                    const impact = isPayer
                      ? -parseFloat(settlement.amount.toString())
                      : parseFloat(settlement.amount.toString());

                    return (
                      <div
                        key={`settlement-${settlement.id}`}
                        className="px-4 py-3 pl-14 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            Settlement {isPayer ? "to" : "from"}{" "}
                            {otherUser.name ?? otherUser.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(settlement.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <span
                            className={cn(
                              "text-sm tabular-nums",
                              impact > 0 && "text-green-600",
                              impact < 0 && "text-red-600"
                            )}
                          >
                            {impact > 0 && "+"}
                            {formatCurrency(impact.toFixed(4), settlement.currency)}
                          </span>
                        </div>
                      </div>
                    );
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


