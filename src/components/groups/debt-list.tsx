"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { SettleUpDialog } from "@/components/settlements/settle-up-dialog";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Decimal from "decimal.js";
import type { User } from "@/types/database";

interface DebtItem {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: string;
}

interface DebtListProps {
  debts: DebtItem[];
  groupId: string;
  currency: string;
  members: User[];
  highlightedUserId?: string;
}

export function DebtList({ debts, groupId, currency, members, highlightedUserId }: DebtListProps) {
  const [selected, setSelected] = useState<DebtItem | null>(null);

  const sorted = highlightedUserId
    ? [...debts].sort((a, b) => {
        const aRelevant = a.fromUserId === highlightedUserId || a.toUserId === highlightedUserId;
        const bRelevant = b.fromUserId === highlightedUserId || b.toUserId === highlightedUserId;
        if (aRelevant && !bRelevant) return -1;
        if (!aRelevant && bRelevant) return 1;
        return 0;
      })
    : debts;

  return (
    <>
      <ul className="space-y-2">
        {sorted.map((d, i) => {
          const isCurrentUserDebt =
            highlightedUserId &&
            (d.fromUserId === highlightedUserId || d.toUserId === highlightedUserId);

          const fromLabel = d.fromUserId === highlightedUserId ? "You" : d.fromName;
          const toLabel = d.toUserId === highlightedUserId ? "You" : d.toName;

          return (
            <li
              key={i}
              className={cn(
                "rounded-lg border bg-card p-4 space-y-2 sm:flex sm:items-center sm:justify-between sm:space-y-0",
                isCurrentUserDebt && "border-primary/30 bg-primary/5"
              )}
            >
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className={cn(
                  "font-medium truncate max-w-[120px] sm:max-w-none",
                  d.fromUserId === highlightedUserId && "text-primary"
                )}>
                  {fromLabel}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className={cn(
                  "font-medium truncate max-w-[120px] sm:max-w-none",
                  d.toUserId === highlightedUserId && "text-primary"
                )}>
                  {toLabel}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-end sm:gap-3">
                <span className="font-semibold tabular-nums">
                  {formatCurrency(d.amount, currency)}
                </span>
                <Button
                  size="sm"
                  variant={isCurrentUserDebt ? "default" : "outline"}
                  onClick={() => setSelected(d)}
                >
                  Settle up
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <SettleUpDialog
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        debt={
          selected
            ? {
                fromUserId: selected.fromUserId,
                toUserId: selected.toUserId,
                amount: new Decimal(selected.amount),
                fromName: selected.fromUserId === highlightedUserId ? "You" : selected.fromName,
                toName: selected.toUserId === highlightedUserId ? "You" : selected.toName,
              }
            : null
        }
        groupId={groupId}
        currency={currency}
        members={members}
      />
    </>
  );
}
