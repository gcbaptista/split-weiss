import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { ArrowRight } from "lucide-react";
import type { SettlementWithUsers } from "@/types/database";

interface SettlementListProps {
  settlements: SettlementWithUsers[];
}

export function SettlementList({ settlements }: SettlementListProps) {
  if (settlements.length === 0) {
    return (
      <EmptyState
        icon="🤝"
        title="No settlements yet"
        description="Once you settle up, it will appear here."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {settlements.map((s) => (
        <li
          key={s.id}
          className="flex items-center justify-between rounded-lg border bg-card p-4"
        >
          <div className="flex flex-wrap items-center gap-2 text-sm min-w-0">
            <span className="font-medium min-w-0 truncate">
              {s.fromUser.name ?? s.fromUser.email}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium min-w-0 truncate">
              {s.toUser.name ?? s.toUser.email}
            </span>
            {s.note && (
              <span className="text-muted-foreground">· {s.note}</span>
            )}
          </div>
          <div className="text-right">
            <p className="font-semibold text-green-600">
              {formatCurrency(s.amount.toString(), s.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(s.date).toLocaleDateString()}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
