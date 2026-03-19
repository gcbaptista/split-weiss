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
  currentUserId?: string;
}

export function DebtList({ debts, groupId, currency, members, currentUserId }: DebtListProps) {
  const [selected, setSelected] = useState<DebtItem | null>(null);

  // Sort: debts involving current user come first
  const sorted = currentUserId
    ? [...debts].sort((a, b) => {
        const aRelevant = a.fromUserId === currentUserId || a.toUserId === currentUserId;
        const bRelevant = b.fromUserId === currentUserId || b.toUserId === currentUserId;
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
            currentUserId &&
            (d.fromUserId === currentUserId || d.toUserId === currentUserId);

          const fromLabel = d.fromUserId === currentUserId ? "You" : d.fromName;
          const toLabel = d.toUserId === currentUserId ? "You" : d.toName;

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
                  d.fromUserId === currentUserId && "text-primary"
                )}>
                  {fromLabel}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className={cn(
                  "font-medium truncate max-w-[120px] sm:max-w-none",
                  d.toUserId === currentUserId && "text-primary"
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
                fromName: selected.fromUserId === currentUserId ? "You" : selected.fromName,
                toName: selected.toUserId === currentUserId ? "You" : selected.toName,
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
