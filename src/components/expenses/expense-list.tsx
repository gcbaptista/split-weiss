"use client";
import { Copy, History, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { deleteExpense, revertExpense } from "@/app/actions/expense.actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatCurrency } from "@/lib/utils";
import type { ExpenseWithSplitsClient, MemberSummary } from "@/types/database";

import { AddExpenseDialog } from "./add-expense-dialog";
import { ExpenseAuditLogDialog } from "./expense-audit-log-dialog";

interface ExpenseListProps {
  expenses: ExpenseWithSplitsClient[];
  defaultPayerId: string;
  groupId: string;
  members: MemberSummary[];
  groupCurrency: string;
  currentMemberId?: string;
  convertedAmounts?: Record<string, string>;
}

export function ExpenseList({
  expenses,
  defaultPayerId,
  groupId,
  members,
  groupCurrency,
  currentMemberId,
  convertedAmounts = {},
}: ExpenseListProps) {
  const t = useTranslations("expenses");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [payerFilter, setPayerFilter] = useState("all");
  const [editingExpense, setEditingExpense] = useState<ExpenseWithSplitsClient | null>(null);
  const [duplicatingExpense, setDuplicatingExpense] = useState<ExpenseWithSplitsClient | null>(null);
  const [historyExpenseId, setHistoryExpenseId] = useState<string | null>(null);
  const [historyExpenseTitle, setHistoryExpenseTitle] = useState<string>("");

  const localExpenses = useMemo(
    () => expenses.filter((e) => !pendingDeleteIds.has(e.id)),
    [expenses, pendingDeleteIds]
  );

  const filteredExpenses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return localExpenses.filter((expense) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        expense.title.toLowerCase().includes(normalizedQuery) ||
        expense.amount.toLowerCase().includes(normalizedQuery);

      const matchesPayer = payerFilter === "all" || expense.payerId === payerFilter;

      return matchesQuery && matchesPayer;
    });
  }, [localExpenses, payerFilter, searchQuery]);

  const selectedPayer = members.find((member) => member.id === payerFilter);

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon="🧾"
        title={t("noExpenses")}
        description={t("noExpensesDescription")}
      />
    );
  }

  async function handleDelete(expense: ExpenseWithSplitsClient) {
    // Optimistically remove from UI
    setPendingDeleteIds((prev) => new Set(prev).add(expense.id));

    const result = await deleteExpense(expense.id);
    if (result.error) {
      toast.error(result.error);
      // Rollback on failure
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(expense.id);
        return next;
      });
      return;
    }

    toast(t("expenseDeleted"), {
      action: {
        label: tc("undo"),
        onClick: async () => {
          const undoResult = await revertExpense(result.data!.auditLogId);
          if (undoResult.error) {
            toast.error(undoResult.error);
          } else {
            setPendingDeleteIds((prev) => {
              const next = new Set(prev);
              next.delete(expense.id);
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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="h-10 sm:flex-1"
        />
        <Select value={payerFilter} onValueChange={(value) => setPayerFilter(value ?? "all")}>
          <SelectTrigger className="h-10 w-full sm:w-56" aria-label="Filter expenses by payer">
            <SelectValue>{selectedPayer?.name ?? t("allPayers")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allPayers")}</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {currentMemberId && (
        <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500/40 border border-emerald-500/60" />
            {t("youPaid")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary/40 border border-primary/60" />
            {t("youOwe")}
          </span>
        </div>
      )}

      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon="🔎"
          title={t("noMatching")}
          description={t("noMatchingDescription")}
        />
      ) : (
        <ul className="space-y-2">
          {filteredExpenses.map((e) => (
            <li
              key={e.id}
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
                {/* Row 1: Title and Amount (mobile) */}
                <div className="flex items-start justify-between gap-2 sm:block">
                  <p className="text-sm font-medium flex-1 min-w-0">{e.title}</p>
                  <div className="text-right shrink-0 sm:hidden">
                    {(() => {
                      const converted = convertedAmounts[e.id];
                      return converted ? (
                        <>
                          <span className="text-base font-semibold tabular-nums">
                            {formatCurrency(e.amount, e.currency)}
                          </span>
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            ≈ {formatCurrency(converted, groupCurrency)}
                          </p>
                        </>
                      ) : (
                        <span className="text-base font-semibold tabular-nums">
                          {formatCurrency(e.amount, e.currency)}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Row 2: Payer and Date */}
                <p className="text-xs text-muted-foreground">
                  {t("paid", { name: e.payerId === currentMemberId ? tc("you") : e.payer.name })} ·{" "}
                  {new Date(e.date).toLocaleDateString()}
                </p>

                {/* Row 3: Users Involved + Actions (mobile) */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {e.splits.slice(0, 6).map((split) => (
                      <Tooltip key={split.userId}>
                        <TooltipTrigger>
                          <Avatar size="sm">
                            <AvatarFallback>
                              {split.user.name?.[0]?.toUpperCase() ?? "?"}
                            </AvatarFallback>
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
                  {/* Action menu — ⋮ dropdown on mobile */}
                  <div className="sm:hidden shrink-0">
                    <ExpenseActionsMenu
                      size="sm"
                      t={t} tc={tc}
                      onEdit={() => setEditingExpense(e)}
                      onDuplicate={() => setDuplicatingExpense(e)}
                      onHistory={() => { setHistoryExpenseId(e.id); setHistoryExpenseTitle(e.title); }}
                      onDelete={() => handleDelete(e)}
                    />
                  </div>
                </div>
              </div>

              {/* Right side: Amount and Actions (desktop only) */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <div className="text-right">
                  {(() => {
                    const converted = convertedAmounts[e.id];
                    return converted ? (
                      <>
                        <span className="text-base font-semibold tabular-nums">
                          {formatCurrency(e.amount, e.currency)}
                        </span>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          ≈ {formatCurrency(converted, groupCurrency)}
                        </p>
                      </>
                    ) : (
                      <span className="text-base font-semibold tabular-nums">
                        {formatCurrency(e.amount, e.currency)}
                      </span>
                    );
                  })()}
                </div>
                <ExpenseActionsMenu
                  t={t} tc={tc}
                  onEdit={() => setEditingExpense(e)}
                  onDuplicate={() => setDuplicatingExpense(e)}
                  onHistory={() => { setHistoryExpenseId(e.id); setHistoryExpenseTitle(e.title); }}
                  onDelete={() => handleDelete(e)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {editingExpense && (
        <AddExpenseDialog
          groupId={groupId}
          members={members}
          groupCurrency={groupCurrency}
          defaultPayerId={defaultPayerId}
          expense={editingExpense}
          open={!!editingExpense}
          onOpenChange={(o) => {
            if (!o) setEditingExpense(null);
          }}
        />
      )}
      {duplicatingExpense && (
        <AddExpenseDialog
          groupId={groupId}
          members={members}
          groupCurrency={groupCurrency}
          defaultPayerId={defaultPayerId}
          templateExpense={duplicatingExpense}
          open={!!duplicatingExpense}
          onOpenChange={(o) => {
            if (!o) setDuplicatingExpense(null);
          }}
        />
      )}
      <ExpenseAuditLogDialog
        expenseId={historyExpenseId}
        expenseTitle={historyExpenseTitle}
        onOpenChange={(o) => {
          if (!o) setHistoryExpenseId(null);
        }}
      />
    </>
  );
}

function ExpenseActionsMenu({
  size = "md",
  t,
  tc,
  onEdit,
  onDuplicate,
  onHistory,
  onDelete,
}: {
  size?: "sm" | "md";
  t: ReturnType<typeof useTranslations<"expenses">>;
  tc: ReturnType<typeof useTranslations<"common">>;
  onEdit: () => void;
  onDuplicate: () => void;
  onHistory: () => void;
  onDelete: () => void;
}) {
  const btnCls = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const iconCls = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={`${btnCls} text-muted-foreground hover:text-foreground`}
            aria-label="Expense actions"
          />
        }
      >
        <MoreVertical className={iconCls} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          {t("actionEdit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy />
          {t("actionDuplicate")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onHistory}>
          <History />
          {t("actionHistory")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onClick={onDelete}>
          <Trash2 />
          {tc("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
