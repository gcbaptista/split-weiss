"use client";
import Decimal from "decimal.js";
import { ArrowRight, Check, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { createSettlement, deleteSettlement } from "@/app/actions/settlement.actions";
import { SettleUpDialog } from "@/components/settlements/settle-up-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useGroupContext } from "@/contexts/group-context";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { SettlementHistoryClient } from "@/types/database";

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
}

export function SettlementPairs({ debts, settlements }: SettlementPairsProps) {
  const {
    groupId,
    groupCurrency: currency,
    members,
    currentMemberId: highlightedUserId,
  } = useGroupContext();
  const t = useTranslations("settlements");
  const tc = useTranslations("common");
  const router = useRouter();
  const [expandedPairs, setExpandedPairs] = useState<Set<string>>(new Set());
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  // Pairs just settled locally, hidden as outstanding until the server-computed
  // `debts` prop catches up — prevents a slow refresh from leaving the "Settle
  // up" button active long enough to be tapped twice for the same debt.
  const [settlingKeys, setSettlingKeys] = useState<Set<string>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  // Once the server-computed `debts` prop refreshes, it already reflects any
  // settlements just recorded — drop the optimistic overrides in the same render.
  const [prevDebts, setPrevDebts] = useState(debts);
  if (prevDebts !== debts) {
    setPrevDebts(debts);
    setSettlingKeys(new Set());
  }

  // Build pair map
  const pairMap = new Map<string, PairData>();

  // Add debts
  for (const d of debts) {
    const key = `${d.fromUserId}:${d.toUserId}`;
    pairMap.set(key, {
      key,
      fromUserId: d.fromUserId,
      toUserId: d.toUserId,
      fromName: d.fromName,
      toName: d.toName,
      debt: settlingKeys.has(key) ? null : d,
      settlements: [],
    });
  }

  // Add settlements to existing pairs or create new ones
  const userMap = new Map(members.map((m) => [m.id, m]));
  for (const s of settlements) {
    if (pendingDeleteIds.has(s.id)) continue;
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
        fromName: fromUser?.name ?? "?",
        toName: toUser?.name ?? "?",
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
      const aRelevant =
        highlightedUserId &&
        (a.fromUserId === highlightedUserId || a.toUserId === highlightedUserId);
      const bRelevant =
        highlightedUserId &&
        (b.fromUserId === highlightedUserId || b.toUserId === highlightedUserId);
      if (aRelevant && !bRelevant) return -1;
      if (!aRelevant && bRelevant) return 1;
      return parseFloat(b.debt.amount) - parseFloat(a.debt.amount);
    }
    return 0;
  });

  if (pairs.length === 0) {
    return (
      <EmptyState
        icon="🤝"
        title={t("noSettlements")}
        description={t("noSettlementsDescription")}
      />
    );
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

  async function handleDeleteSettlement(settlement: SettlementHistoryClient) {
    setPendingDeleteIds((prev) => new Set(prev).add(settlement.id));

    const result = await deleteSettlement(settlement.id);
    if (result.error) {
      toast.error(result.error);
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(settlement.id);
        return next;
      });
      return;
    }

    toast(t("settlementDeleted"), {
      action: {
        label: tc("undo"),
        onClick: async () => {
          const undoResult = await createSettlement({
            groupId,
            fromUserId: settlement.fromUserId,
            toUserId: settlement.toUserId,
            amount: settlement.amount,
            currency: settlement.currency,
            date: settlement.date.toISOString().split("T")[0],
            note: settlement.note ?? undefined,
          });
          if (undoResult.error) {
            toast.error(undoResult.error);
          } else {
            setPendingDeleteIds((prev) => {
              const next = new Set(prev);
              next.delete(settlement.id);
              return next;
            });
            toast.success(tc("restored"));
            router.refresh();
          }
        },
      },
      duration: 5000,
    });

    router.refresh();
  }

  return (
    <>
      <ul className="space-y-2">
        {pairs.map((pair) => {
          const isOutstanding = !!pair.debt;
          const isUserRelevant =
            highlightedUserId &&
            (pair.fromUserId === highlightedUserId || pair.toUserId === highlightedUserId);
          const fromLabel = pair.fromUserId === highlightedUserId ? tc("you") : pair.fromName;
          const toLabel = pair.toUserId === highlightedUserId ? tc("you") : pair.toName;
          const isExpanded = expandedPairs.has(pair.key);
          const hasHistory = pair.settlements.length > 0;

          return (
            <li
              key={pair.key}
              className={cn(
                "rounded-lg border bg-card overflow-hidden",
                isUserRelevant && isOutstanding && "border-primary/30 bg-primary/5"
              )}
            >
              {/* Pair header */}
              <div className="p-4 space-y-2 sm:flex sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  {!isOutstanding && (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium truncate max-w-[120px] sm:max-w-none",
                      pair.fromUserId === highlightedUserId && "text-primary"
                    )}
                  >
                    {fromLabel}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span
                    className={cn(
                      "text-sm font-medium truncate max-w-[120px] sm:max-w-none",
                      pair.toUserId === highlightedUserId && "text-primary"
                    )}
                  >
                    {toLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between sm:justify-end sm:gap-3">
                  {isOutstanding ? (
                    <>
                      <span className="text-base font-semibold tabular-nums">
                        {formatCurrency(pair.debt!.amount, currency)}
                      </span>
                      <Button
                        size="sm"
                        variant={isUserRelevant ? "default" : "outline"}
                        onClick={() => setSelectedDebt(pair.debt)}
                      >
                        {t("settleUp")}
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      {t("settledUp")}
                    </span>
                  )}
                </div>
              </div>

              {/* Expandable history */}
              {hasHistory && (
                <>
                  <button
                    onClick={() => togglePair(pair.key)}
                    className="w-full flex items-center gap-2 px-4 py-2 border-t bg-muted/20 hover:bg-muted/40 transition-colors text-xs text-muted-foreground"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    {tc("pastSettlement", { count: pair.settlements.length })}
                  </button>
                  {isExpanded && (
                    <div className="divide-y border-t">
                      {pair.settlements.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 pl-9 bg-muted/10"
                        >
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">
                              {formatDate(s.date)}
                              {s.note && (
                                <span>
                                  {" · "}
                                  {s.note}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-medium tabular-nums text-green-600 dark:text-green-400">
                              {formatCurrency(s.amount.toString(), s.currency)}
                            </span>
                            <button
                              onClick={() => handleDeleteSettlement(s)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              aria-label={tc("delete")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
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
        debt={
          selectedDebt
            ? {
                fromUserId: selectedDebt.fromUserId,
                toUserId: selectedDebt.toUserId,
                amount: new Decimal(selectedDebt.amount),
                fromName:
                  selectedDebt.fromUserId === highlightedUserId ? tc("you") : selectedDebt.fromName,
                toName:
                  selectedDebt.toUserId === highlightedUserId ? tc("you") : selectedDebt.toName,
              }
            : null
        }
        groupId={groupId}
        currency={currency}
        onSettled={() => {
          if (!selectedDebt) return;
          const key = `${selectedDebt.fromUserId}:${selectedDebt.toUserId}`;
          setSettlingKeys((prev) => new Set(prev).add(key));
        }}
      />
    </>
  );
}
