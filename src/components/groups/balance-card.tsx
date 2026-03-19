import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatCurrency } from "@/lib/utils";
import type { NetBalance } from "@/lib/balances/calculator";
import type { User } from "@/types/database";

interface BalanceCardProps {
  balance: NetBalance;
  user: User;
  currency: string;
}

export function BalanceCard({ balance, user, currency }: BalanceCardProps) {
  const amount = parseFloat(balance.netAmount.toString());
  const isPositive = amount > 0.005;
  const isNegative = amount < -0.005;
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{user.name ?? user.email}</p>
            <p className="text-xs text-muted-foreground">
              {isPositive ? "is owed" : isNegative ? "owes" : "is settled up"}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "font-semibold",
            isPositive && "text-green-600",
            isNegative && "text-red-500"
          )}
        >
          {isPositive ? "+" : ""}
          {formatCurrency(balance.netAmount.toString(), currency)}
        </span>
      </CardContent>
    </Card>
  );
}
