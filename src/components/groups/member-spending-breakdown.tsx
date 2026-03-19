"use client";
import { useState } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { User, ExpenseWithSplitsClient } from "@/types/database";

export interface MemberSpend {
  userId: string;
  paid: string;
  share: string;
}

interface MemberSpendingBreakdownProps {
  members: User[];
  expensesByMember: Map<string, ExpenseWithSplitsClient[]>;
  memberSpend: MemberSpend[];
  grandTotal: string;
  currency: string;
  highlightedUserId?: string;
}

export function MemberSpendingBreakdown({
  members,
  expensesByMember,
  memberSpend,
  grandTotal,
  currency,
  highlightedUserId,
}: MemberSpendingBreakdownProps) {
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

  const spendMap = new Map(memberSpend.map((s) => [s.userId, s]));

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
      <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-2 border-b bg-muted/20">
        <div className="h-4 w-4" />
        <span className="text-xs text-muted-foreground">Member</span>
        <span className="w-24 text-right text-xs text-muted-foreground">Paid</span>
        <span className="w-24 text-right text-xs text-muted-foreground">Share</span>
      </div>

      {/* Member breakdown */}
      <div className="divide-y">
        {sortedMembers.map((member) => {
          const expenses = expensesByMember.get(member.id) ?? [];
          const spend = spendMap.get(member.id);
          const isExpanded = expandedMembers.has(member.id);
          const isHighlightedUser = member.id === highlightedUserId;

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
                <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-3">
                  {/* Expand/collapse icon */}
                  <div className="shrink-0">
                    {expenses.length > 0 ? (
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
                    {expenses.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {/* Paid amount */}
                  <div className="w-24 text-right">
                    <span className="text-sm tabular-nums">
                      {formatCurrency(spend?.paid ?? "0", currency)}
                    </span>
                  </div>

                  {/* Share amount */}
                  <div className="w-24 text-right">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {formatCurrency(spend?.share ?? "0", currency)}
                    </span>
                  </div>
                </div>
              </button>

              {/* Expense list - shown when expanded */}
              {isExpanded && expenses.length > 0 && (
                <div className="border-t divide-y bg-muted/20">
                  {expenses.map((expense) => {
                    // Share attributed to the member for this expense.
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
                        key={expense.id}
                        className="px-4 py-3 pl-14 grid grid-cols-[1fr_auto_auto] items-center gap-3"
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
                        <div className="w-24 text-right shrink-0">
                          {isPayer ? (
                            <span className="text-sm tabular-nums">
                              {formatCurrency(expense.amount, expense.currency)}
                            </span>
                          ) : (
                            <span className="text-sm tabular-nums text-muted-foreground">
                              —
                            </span>
                          )}
                        </div>
                        <div className="w-24 text-right shrink-0">
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {formatCurrency(memberShare, expense.currency)}
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

