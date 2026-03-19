import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { User } from "@/types/database";

export interface MemberSpend {
  userId: string;
  paid: string;
  share: string;
}

interface SpendingSummaryProps {
  grandTotal: string;
  members: User[];
  memberSpend: MemberSpend[];
  currency: string;
  highlightedUserId?: string;
}

export function SpendingSummary({
  grandTotal,
  members,
  memberSpend,
  currency,
  highlightedUserId,
}: SpendingSummaryProps) {
  const spendMap = new Map(memberSpend.map((s) => [s.userId, s]));

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Grand total header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/40">
        <span className="text-sm font-semibold">Group total</span>
        <span className="font-bold tabular-nums">{formatCurrency(grandTotal, currency)}</span>
      </div>

      {/* Per-member rows */}
      <div className="divide-y">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 text-xs text-muted-foreground">
          <span>Member</span>
          <span className="w-24 text-right">Paid</span>
          <span className="w-24 text-right">Share</span>
        </div>

        {members.map((m) => {
          const spend = spendMap.get(m.id);
          if (!spend) return null;
          const isHighlightedUser = m.id === highlightedUserId;
          return (
            <div
              key={m.id}
              className={cn(
                "grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 text-sm",
                isHighlightedUser && "bg-primary/5"
              )}
            >
              <span className={cn("font-medium truncate", isHighlightedUser && "text-primary")}>
                {isHighlightedUser ? "You" : (m.name ?? m.email)}
              </span>
              <span className="w-24 text-right tabular-nums">
                {formatCurrency(spend.paid, currency)}
              </span>
              <span className="w-24 text-right tabular-nums text-muted-foreground">
                {formatCurrency(spend.share, currency)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
