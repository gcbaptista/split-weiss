"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { SettleUpDialog } from "@/components/settlements/settle-up-dialog";
import { formatCurrency } from "@/lib/utils";
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
}

export function DebtList({ debts, groupId, currency, members }: DebtListProps) {
  const [selected, setSelected] = useState<DebtItem | null>(null);

  return (
    <>
      <ul className="space-y-2">
        {debts.map((d, i) => (
          <li
            key={i}
            className="rounded-lg border bg-card p-4 space-y-2 sm:flex sm:items-center sm:justify-between sm:space-y-0"
          >
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-medium truncate max-w-[120px] sm:max-w-none">{d.fromName}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate max-w-[120px] sm:max-w-none">{d.toName}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-end sm:gap-3">
              <span className="font-semibold">
                {formatCurrency(d.amount, currency)}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelected(d)}
              >
                Settle up
              </Button>
            </div>
          </li>
        ))}
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
                fromName: selected.fromName,
                toName: selected.toName,
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
