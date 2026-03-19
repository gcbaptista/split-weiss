"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, History } from "lucide-react";
import { deleteExpense } from "@/app/actions/expense.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { AddExpenseDialog } from "./add-expense-dialog";
import { ExpenseAuditLogDialog } from "./expense-audit-log-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { User, ExpenseWithSplitsClient } from "@/types/database";

interface ExpenseListProps {
  expenses: ExpenseWithSplitsClient[];
  defaultPayerId: string;
  groupId: string;
  members: User[];
  groupCurrency: string;
}

export function ExpenseList({
  expenses,
  defaultPayerId,
  groupId,
  members,
  groupCurrency,
}: ExpenseListProps) {
  const router = useRouter();
  const [localExpenses, setLocalExpenses] = useState(expenses);
  const [searchQuery, setSearchQuery] = useState("");
  const [payerFilter, setPayerFilter] = useState("all");
  const [editingExpense, setEditingExpense] = useState<ExpenseWithSplitsClient | null>(null);
  const [historyExpenseId, setHistoryExpenseId] = useState<string | null>(null);
  const [historyExpenseTitle, setHistoryExpenseTitle] = useState<string>("");
  // Keep timers so we can cancel on undo
  const deleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Sync when server re-renders with fresh data
  useEffect(() => {
    setLocalExpenses(expenses);
  }, [expenses]);

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

  if (localExpenses.length === 0) {
    return (
      <EmptyState
        icon="🧾"
        title="No expenses yet"
        description="Add the first expense to start splitting."
      />
    );
  }

  function handleDelete(expense: ExpenseWithSplitsClient) {
    setLocalExpenses((prev) => prev.filter((e) => e.id !== expense.id));

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
          setLocalExpenses((prev) => {
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
        setLocalExpenses((prev) => {
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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by title or amount"
          aria-label="Search expenses by title or amount"
          className="h-10 sm:flex-1"
        />
        <Select value={payerFilter} onValueChange={(value) => setPayerFilter(value ?? "all")}>
          <SelectTrigger className="h-10 w-full sm:w-56" aria-label="Filter expenses by payer">
            <SelectValue>
              {selectedPayer?.name ?? selectedPayer?.email ?? "All payers"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payers</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name ?? member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon="🔎"
          title="No matching expenses"
          description="Try a different title, amount, or payer."
        />
      ) : (
      <ul className="space-y-2">
        {filteredExpenses.map((e) => (
          <li
            key={e.id}
            className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 rounded-lg border bg-card p-3 sm:p-4"
          >
            {/* Left side: Content */}
            <div className="min-w-0 flex-1 space-y-1.5">
              {/* Row 1: Title and Amount (mobile) */}
              <div className="flex items-start justify-between gap-2 sm:block">
                <p className="font-medium flex-1 min-w-0">{e.title}</p>
                <span className="font-semibold tabular-nums shrink-0 sm:hidden">
                  {formatCurrency(e.amount, e.currency)}
                </span>
              </div>

              {/* Row 2: Payer and Date */}
              <p className="text-sm text-muted-foreground">
                {e.payer.name ?? e.payer.email} paid · {new Date(e.date).toLocaleDateString()}
              </p>

              {/* Row 3: Users Involved */}
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
                      <p>{split.user.name ?? split.user.email}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {e.splits.length > 6 && (
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                    +{e.splits.length - 6}
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Amount (desktop) and Actions */}
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0">
              {/* Amount - desktop only */}
              <span className="hidden sm:inline font-semibold tabular-nums">
                {formatCurrency(e.amount, e.currency)}
              </span>

              {/* Action buttons */}
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setEditingExpense(e)}
                  aria-label="Edit expense"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(e)}
                  aria-label="Delete expense"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
