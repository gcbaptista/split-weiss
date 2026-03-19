"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { deleteExpense } from "@/app/actions/expense.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { AddExpenseDialog } from "./add-expense-dialog";
import type { User, ExpenseWithSplitsClient } from "@/types/database";

interface ExpenseListProps {
  expenses: ExpenseWithSplitsClient[];
  currentUserId: string;
  groupId: string;
  members: User[];
  groupCurrency: string;
}

const MODE_LABELS: Record<string, string> = {
  EQUAL: "Equal",
  PERCENTAGE: "%",
  VALUE: "Amount",
  LOCK: "Lock",
};

export function ExpenseList({
  expenses,
  currentUserId,
  groupId,
  members,
  groupCurrency,
}: ExpenseListProps) {
  const router = useRouter();
  const [editingExpense, setEditingExpense] = useState<ExpenseWithSplitsClient | null>(null);

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon="🧾"
        title="No expenses yet"
        description="Add the first expense to start splitting."
      />
    );
  }

  async function handleDelete(id: string) {
    const result = await deleteExpense(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Expense deleted");
    router.refresh();
  }

  return (
    <>
      <ul className="space-y-2">
        {expenses.map((e) => (
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
              <span className="font-semibold">
                {formatCurrency(e.amount, e.currency)}
              </span>
              {e.payerId === currentUserId && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingExpense(e)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(e.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
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
    </>
  );
}
