"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown, ChevronRight, Check } from "lucide-react";
import { SettleUpDialog } from "@/components/settlements/settle-up-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, cn } from "@/lib/utils";
import Decimal from "decimal.js";
import type { UserSummary, SettlementHistoryClient } from "@/types/database";

interface DebtItem {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: string;
}

interface PairData {
  key: string;
  fromUserId: string;
  toUserId: string;
  fromName: string;
  toName: string;
  debt: DebtItem | null;
  settlements: SettlementHistoryClient[];
}

interface SettlementPairsProps {
  debts: DebtItem[];
  settlements: SettlementHistoryClient[];
  groupId: string;
  currency: string;
  members: UserSummary[];
  highlightedUserId?: string;
}

export function SettlementPairs({
  debts,
  settlements,
  groupId,
  currency,
  members,
  highlightedUserId,
}: SettlementPairsProps) {
  const [expandedPairs, setExpandedPairs] = useState<Set<string>>(new Set());
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);

  // Build pair map
  const pairMap = new Map<string, PairData>();

  // Add debts
  for (const d of debts) {
    const key = `${d.fromUserId}:${d.toUserId}`;
    pairMap.set(key, { key, fromUserId: d.fromUserId, toUserId: d.toUserId, fromName: d.fromName, toName: d.toName, debt: d, settlements: [] });
  }

  // Add settlements to existing pairs or create new ones
  const userMap = new Map(members.map((m) => [m.id, m]));
  for (const s of settlements) {
    const key = `${s.fromUserId}:${s.toUserId}`;
    const existing = pairMap.get(key);
    if (existing) {
      existing.settlements.push(s);
    } else {
      const fromUser = userMap.get(s.fromUserId);
      const toUser = userMap.get(s.toUserId);
      pairMap.set(key, {
        key,
        fromUserId: s.fromUserId,
        toUserId: s.toUserId,
        fromName: fromUser?.name ?? fromUser?.email ?? "?",
        toName: toUser?.name ?? toUser?.email ?? "?",
        debt: null,
        settlements: [s],
      });
    }
  }

  // Sort: outstanding first (user-relevant first, then by amount), settled last
  const pairs = [...pairMap.values()].sort((a, b) => {
    if (a.debt && !b.debt) return -1;
    if (!a.debt && b.debt) return 1;
    if (a.debt && b.debt) {
      const aRelevant = highlightedUserId && (a.fromUserId === highlightedUserId || a.toUserId === highlightedUserId);
      const bRelevant = highlightedUserId && (b.fromUserId === highlightedUserId || b.toUserId === highlightedUserId);
      if (aRelevant && !bRelevant) return -1;
      if (!aRelevant && bRelevant) return 1;
      return parseFloat(b.debt.amount) - parseFloat(a.debt.amount);
    }
    return 0;
  });

  if (pairs.length === 0) {
    return <EmptyState icon="🤝" title="No settlements" description="Once debts are calculated, suggested settlements will appear here." />;
  }

  const togglePair = (key: string) => {
    setExpandedPairs((prev) => {
      const next = new Set(prev);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  return (
    <>
      <ul className="space-y-2">
        {pairs.map((pair) => {
          const isOutstanding = !!pair.debt;
          const isUserRelevant = highlightedUserId && (pair.fromUserId === highlightedUserId || pair.toUserId === highlightedUserId);
          const fromLabel = pair.fromUserId === highlightedUserId ? "You" : pair.fromName;
          const toLabel = pair.toUserId === highlightedUserId ? "You" : pair.toName;
          const isExpanded = expandedPairs.has(pair.key);
          const hasHistory = pair.settlements.length > 0;

          return (
            <li key={pair.key} className={cn(
              "rounded-lg border bg-card overflow-hidden",
              isUserRelevant && isOutstanding && "border-primary/30 bg-primary/5"
            )}>
              {/* Pair header */}
              <div className="p-4 space-y-2 sm:flex sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  {!isOutstanding && <Check className="h-4 w-4 text-green-600 shrink-0" />}
                  <span className={cn("text-sm font-medium truncate max-w-[120px] sm:max-w-none", pair.fromUserId === highlightedUserId && "text-primary")}>{fromLabel}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className={cn("text-sm font-medium truncate max-w-[120px] sm:max-w-none", pair.toUserId === highlightedUserId && "text-primary")}>{toLabel}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-end sm:gap-3">
                  {isOutstanding ? (
                    <>
                      <span className="text-base font-semibold tabular-nums">{formatCurrency(pair.debt!.amount, currency)}</span>
                      <Button size="sm" variant={isUserRelevant ? "default" : "outline"} onClick={() => setSelectedDebt(pair.debt)}>Settle up</Button>
                    </>
                  ) : (
                    <span className="text-xs text-green-600 font-medium">Settled up</span>
                  )}
                </div>
              </div>

              {/* Expandable history */}
              {hasHistory && (
                <>
                  <button onClick={() => togglePair(pair.key)} className="w-full flex items-center gap-2 px-4 py-2 border-t bg-muted/20 hover:bg-muted/40 transition-colors text-xs text-muted-foreground">
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {pair.settlements.length} past settlement{pair.settlements.length !== 1 ? "s" : ""}
                  </button>
                  {isExpanded && (
                    <div className="divide-y border-t">
                      {pair.settlements.map((s) => (
                        <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 pl-9 bg-muted/10">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">
                              {new Date(s.date).toLocaleDateString()}
                              {s.note && <span>{" · "}{s.note}</span>}
                            </p>
                          </div>
                          <span className="text-sm font-medium tabular-nums text-green-600 shrink-0">{formatCurrency(s.amount.toString(), s.currency)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
      <SettleUpDialog
        open={!!selectedDebt}
        onOpenChange={(v) => !v && setSelectedDebt(null)}
        debt={selectedDebt ? { fromUserId: selectedDebt.fromUserId, toUserId: selectedDebt.toUserId, amount: new Decimal(selectedDebt.amount), fromName: selectedDebt.fromUserId === highlightedUserId ? "You" : selectedDebt.fromName, toName: selectedDebt.toUserId === highlightedUserId ? "You" : selectedDebt.toName } : null}
        groupId={groupId}
        currency={currency}
      />
    </>
  );
}

