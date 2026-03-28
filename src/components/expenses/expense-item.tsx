"use client";

import type { useTranslations } from "next-intl";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatCurrency } from "@/lib/utils";
import type { ExpenseWithSplitsClient } from "@/types/database";

import { ExpenseActionsMenu } from "./expense-actions-menu";

interface ExpenseAmountProps {
  amount: string;
  currency: string;
  convertedAmount?: string;
  groupCurrency: string;
}

function ExpenseAmount({ amount, currency, convertedAmount, groupCurrency }: ExpenseAmountProps) {
  return convertedAmount ? (
    <>
      <span className="text-base font-semibold tabular-nums">
        {formatCurrency(amount, currency)}
      </span>
      <p className="text-[10px] text-muted-foreground tabular-nums">
        ≈ {formatCurrency(convertedAmount, groupCurrency)}
      </p>
    </>
  ) : (
    <span className="text-base font-semibold tabular-nums">{formatCurrency(amount, currency)}</span>
  );
}

interface ExpenseItemProps {
  expense: ExpenseWithSplitsClient;
  currentMemberId?: string;
  groupCurrency: string;
  convertedAmount?: string;
  t: ReturnType<typeof useTranslations<"expenses">>;
  tc: ReturnType<typeof useTranslations<"common">>;
  formattedDate: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onHistory: () => void;
  onDelete: () => void;
}

export function ExpenseItem({
  expense: e,
  currentMemberId,
  groupCurrency,
  convertedAmount,
  t,
  tc,
  formattedDate,
  onEdit,
  onDuplicate,
  onHistory,
  onDelete,
}: ExpenseItemProps) {
  const amountProps = { amount: e.amount, currency: e.currency, convertedAmount, groupCurrency };
  const actionProps = { t, tc, onEdit, onDuplicate, onHistory, onDelete };

  return (
    <li
      className={cn(
        "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 rounded-lg border bg-card p-3 sm:p-4",
        currentMemberId &&
          e.payerId === currentMemberId &&
          "border-emerald-500/30 bg-emerald-500/5",
        currentMemberId &&
          e.payerId !== currentMemberId &&
          e.splits.some((s) => s.userId === currentMemberId) &&
          "border-primary/30 bg-primary/5"
      )}
    >
      {/* Left side: Content */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2 sm:block">
          <p className="text-sm font-medium flex-1 min-w-0">{e.title}</p>
          <div className="text-right shrink-0 sm:hidden">
            <ExpenseAmount {...amountProps} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {t("paid", { name: e.payerId === currentMemberId ? tc("you") : e.payer.name })} ·{" "}
          {formattedDate}
        </p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {e.splits.slice(0, 6).map((split) => (
              <Tooltip key={split.userId}>
                <TooltipTrigger>
                  <Avatar size="sm">
                    <AvatarFallback>{split.user.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{split.user.name}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            {e.splits.length > 6 && (
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                +{e.splits.length - 6}
              </div>
            )}
          </div>
          <div className="sm:hidden shrink-0">
            <ExpenseActionsMenu size="sm" {...actionProps} />
          </div>
        </div>
      </div>

      {/* Right side: Amount and Actions (desktop only) */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <div className="text-right">
          <ExpenseAmount {...amountProps} />
        </div>
        <ExpenseActionsMenu {...actionProps} />
      </div>
    </li>
  );
}
