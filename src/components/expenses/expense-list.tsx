"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { deleteExpense, revertExpense } from "@/app/actions/expense.actions";
import { EmptyState } from "@/components/shared/empty-state";
import { useGroupContext } from "@/contexts/group-context";
import { useExpenseFilters } from "@/hooks/use-expense-filters";
import { formatDate } from "@/lib/utils";
import type { ExpenseWithSplitsClient } from "@/types/database";

import { AddExpenseDialog } from "./add-expense-dialog";
import { ExpenseAuditLogDialog } from "./expense-audit-log-dialog";
import { ExpenseFilterPanel } from "./expense-filter-panel";
import { ExpenseItem } from "./expense-item";

interface ExpenseListProps {
  expenses: ExpenseWithSplitsClient[];
  convertedAmounts?: Record<string, string>;
}

export function ExpenseList({
  expenses,
  convertedAmounts = {},
}: ExpenseListProps) {
  const { members, groupCurrency, currentMemberId } = useGroupContext();
  const t = useTranslations("expenses");
  const tc = useTranslations("common");
  const router = useRouter();

  const filters = useExpenseFilters({ expenses, currentMemberId });

  const [editingExpense, setEditingExpense] = useState<ExpenseWithSplitsClient | null>(null);
  const [duplicatingExpense, setDuplicatingExpense] = useState<ExpenseWithSplitsClient | null>(null);
  const [historyExpenseId, setHistoryExpenseId] = useState<string | null>(null);
  const [historyExpenseTitle, setHistoryExpenseTitle] = useState<string>("");

  if (expenses.length === 0) {
    return (
      <EmptyState icon="🧾" title={t("noExpenses")} description={t("noExpensesDescription")} />
    );
  }

  async function handleDelete(expense: ExpenseWithSplitsClient) {
    filters.setPendingDeleteIds((prev) => new Set(prev).add(expense.id));

    const result = await deleteExpense(expense.id);
    if (result.error) {
      toast.error(result.error);
      filters.setPendingDeleteIds((prev) => {
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
            filters.setPendingDeleteIds((prev) => {
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

  function formatGroupLabel(key: string): string {
    if (filters.groupBy === "payer") {
      return members.find((m) => m.id === key)?.name ?? key;
    }
    if (filters.groupBy === "day") {
      return formatDate(key, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }
    if (filters.groupBy === "month") {
      const [year, month] = key.split("-");
      return formatDate(new Date(Number(year), Number(month) - 1), {
        year: "numeric",
        month: "long",
      });
    }
    const weekStart = new Date(key);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return `${formatDate(weekStart, { month: "short", day: "numeric" })} – ${formatDate(weekEnd, { month: "short", day: "numeric", year: "numeric" })}`;
  }

  function renderItem(e: ExpenseWithSplitsClient) {
    return (
      <ExpenseItem
        key={e.id}
        expense={e}
        currentMemberId={currentMemberId}
        groupCurrency={groupCurrency}
        convertedAmount={convertedAmounts[e.id]}
        t={t}
        tc={tc}
        formattedDate={formatDate(e.date)}
        onEdit={() => setEditingExpense(e)}
        onDuplicate={() => setDuplicatingExpense(e)}
        onHistory={() => { setHistoryExpenseId(e.id); setHistoryExpenseTitle(e.title); }}
        onDelete={() => handleDelete(e)}
      />
    );
  }

  function renderExpenseList() {
    if (filters.filteredAndSortedExpenses.length === 0) {
      return (
        <EmptyState icon="🔎" title={t("noMatching")} description={t("noMatchingDescription")} />
      );
    }

    if (filters.groupedExpenses) {
      return (
        <div className="space-y-6">
          {[...filters.groupedExpenses.entries()].map(([key, items]) => (
            <section key={key}>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {formatGroupLabel(key)}
              </h3>
              <ul className="space-y-2">{items.map(renderItem)}</ul>
            </section>
          ))}
        </div>
      );
    }

    return (
      <ul className="space-y-2">
        {filters.filteredAndSortedExpenses.map(renderItem)}
      </ul>
    );
  }

  return (
    <>
      <ExpenseFilterPanel
        t={t}
        members={members}
        currentMemberId={currentMemberId}
        searchQuery={filters.searchQuery}
        setSearchQuery={filters.setSearchQuery}
        sortBy={filters.sortBy}
        setSortBy={filters.setSortBy}
        groupBy={filters.groupBy}
        setGroupBy={filters.setGroupBy}
        showFilters={filters.showFilters}
        setShowFilters={filters.setShowFilters}
        activeFilterCount={filters.activeFilterCount}
        clearFilters={filters.clearFilters}
        payerFilter={filters.payerFilter}
        setPayerFilter={filters.setPayerFilter}
        participantFilter={filters.participantFilter}
        setParticipantFilter={filters.setParticipantFilter}
        currencyFilter={filters.currencyFilter}
        setCurrencyFilter={filters.setCurrencyFilter}
        onlyMine={filters.onlyMine}
        setOnlyMine={filters.setOnlyMine}
        dateFrom={filters.dateFrom}
        setDateFrom={filters.setDateFrom}
        dateTo={filters.dateTo}
        setDateTo={filters.setDateTo}
        currencies={filters.currencies}
      />

      {renderExpenseList()}

      {editingExpense && (
        <AddExpenseDialog
          expense={editingExpense}
          open={!!editingExpense}
          onOpenChange={(o) => { if (!o) setEditingExpense(null); }}
        />
      )}
      {duplicatingExpense && (
        <AddExpenseDialog
          templateExpense={duplicatingExpense}
          open={!!duplicatingExpense}
          onOpenChange={(o) => { if (!o) setDuplicatingExpense(null); }}
        />
      )}
      <ExpenseAuditLogDialog
        expenseId={historyExpenseId}
        expenseTitle={historyExpenseTitle}
        onOpenChange={(o) => { if (!o) setHistoryExpenseId(null); }}
      />
    </>
  );
}
