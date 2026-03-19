"use client";
import { useState, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, History } from "lucide-react";
import { deleteExpense } from "@/app/actions/expense.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { AddExpenseDialog } from "./add-expense-dialog";
import { ExpenseAuditLogDialog } from "./expense-audit-log-dialog";
import type { User, ExpenseWithSplitsClient } from "@/types/database";

interface ExpenseListProps {
  expenses: ExpenseWithSplitsClient[];
  currentUserId: string;
  groupId: string;
  members: User[];
  groupCurrency: string;
  isAdmin: boolean;
}

const MODE_LABELS: Record<string, string> = {
  PERCENTAGE: "%",
  LOCK: "Amount",
};

export function ExpenseList({
  expenses,
  currentUserId,
  groupId,
  members,
  groupCurrency,
  isAdmin,
}: ExpenseListProps) {
  const router = useRouter();
  const [visibleExpenses, setVisibleExpenses] = useState(expenses);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithSplitsClient | null>(null);
  const [historyExpenseId, setHistoryExpenseId] = useState<string | null>(null);
  const [historyExpenseTitle, setHistoryExpenseTitle] = useState<string>("");
  // Keep timers so we can cancel on undo
  const deleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Sync when server re-renders with fresh data
  useEffect(() => {
    setVisibleExpenses(expenses);
  }, [expenses]);

  if (visibleExpenses.length === 0) {
    return (
      <EmptyState
        icon="🧾"
        title="No expenses yet"
        description="Add the first expense to start splitting."
      />
    );
  }

  function handleDelete(expense: ExpenseWithSplitsClient) {
    // Optimistically remove from view
    setVisibleExpenses((prev) => prev.filter((e) => e.id !== expense.id));

    const toastId = toast("Expense deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          // Cancel the pending server deletion
          const timer = deleteTimers.current.get(expense.id);
          if (timer) {
            clearTimeout(timer);
            deleteTimers.current.delete(expense.id);
          }
          // Restore the expense in the correct position
          setVisibleExpenses((prev) => {
            const next = [...prev, expense];
            return next.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
          });
        },
      },
      duration: 5000,
    });

    // Delay the actual server call so undo has a window
    const timer = setTimeout(async () => {
      deleteTimers.current.delete(expense.id);
      toast.dismiss(toastId);
      const result = await deleteExpense(expense.id);
      if (result.error) {
        toast.error(result.error);
        // Rollback on failure
        setVisibleExpenses((prev) => {
          const next = [...prev, expense];
          return next.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        });
      } else {
        router.refresh();
      }
    }, 5000);

    deleteTimers.current.set(expense.id, timer);
  }

  return (
    <>
      <ul className="space-y-2">
        {visibleExpenses.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between rounded-lg border bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{e.title}</p>
                <Badge variant="outline" className="text-xs">
                  {MODE_LABELS[e.splitMode]}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {e.payer.name ?? e.payer.email} paid ·{" "}
                {new Date(e.date).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 pl-2">
              <span className="font-semibold tabular-nums">
                {formatCurrency(e.amount, e.currency)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setEditingExpense(e)}
                aria-label="Edit expense"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {(e.payerId === currentUserId || isAdmin) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(e)}
                  aria-label="Delete expense"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => { setHistoryExpenseId(e.id); setHistoryExpenseTitle(e.title); }}
                aria-label="View history"
              >
                <History className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {editingExpense && (
        <AddExpenseDialog
          groupId={groupId}
          members={members}
          groupCurrency={groupCurrency}
          currentUserId={currentUserId}
          expense={editingExpense}
          open={!!editingExpense}
          onOpenChange={(o) => { if (!o) setEditingExpense(null); }}
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
