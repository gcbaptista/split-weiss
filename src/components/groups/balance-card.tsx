import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { NetBalance } from "@/lib/balances/calculator";
import { cn, formatCurrency } from "@/lib/utils";
import type { MemberSummary } from "@/types/database";

interface BalanceCardProps {
  balance: NetBalance;
  user: MemberSummary;
  currency: string;
  isCurrentUser?: boolean;
}

export function BalanceCard({ balance, user, currency, isCurrentUser }: BalanceCardProps) {
  const amount = parseFloat(balance.netAmount.toString());
  const isPositive = amount > 0.005;
  const isNegative = amount < -0.005;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border bg-card p-4 transition-colors",
        isCurrentUser && "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className={cn(isCurrentUser && "bg-primary/20")}>
            {user.name?.[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{isCurrentUser ? "You" : user.name}</p>
          <p
            className={cn(
              "flex items-center gap-1 text-xs",
              isPositive && "text-green-600",
              isNegative && "text-red-500",
              !isPositive && !isNegative && "text-muted-foreground"
            )}
          >
            {isPositive && <TrendingUp className="h-3 w-3" aria-hidden />}
            {isNegative && <TrendingDown className="h-3 w-3" aria-hidden />}
            {!isPositive && !isNegative && <Minus className="h-3 w-3" aria-hidden />}
            {isPositive
              ? isCurrentUser
                ? "you are owed"
                : "is owed"
              : isNegative
                ? isCurrentUser
                  ? "you owe"
                  : "owes"
                : "settled up"}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "font-semibold tabular-nums",
          isPositive && "text-green-600",
          isNegative && "text-red-500",
          !isPositive && !isNegative && "text-muted-foreground"
        )}
      >
        {isPositive ? "+" : ""}
        {formatCurrency(balance.netAmount.toString(), currency)}
      </span>
    </div>
  );
}
