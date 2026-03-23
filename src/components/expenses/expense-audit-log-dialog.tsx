"use client";
import { useEffect, useState } from "react";
import { getExpenseAuditLog } from "@/app/actions/expense.actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { ExpenseAuditLogEntry, ExpenseStateSnapshot, ExpenseDelta } from "@/types/audit";

interface Props {
  expenseId: string | null;
  expenseTitle: string;
  onOpenChange: (open: boolean) => void;
}

const ACTION_BADGE: Record<string, { label: string; className: string }> = {
  CREATED: { label: "Created", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  UPDATED: { label: "Updated", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  DELETED: { label: "Deleted", className: "bg-destructive/10 text-destructive" },
};

function DiffRow({ label, before, after }: { label: string; before: string; after: string }) {
  if (before === after) return null;
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>
        <span className="line-through text-muted-foreground mr-2">{before}</span>
        <span>{after}</span>
      </span>
    </div>
  );
}

function splitsSummary(splits: ExpenseStateSnapshot["splits"]) {
  return splits.map(s => `${s.userName}: ${s.amount}`).join(", ");
}

function SnapshotSummary({ state }: { state: ExpenseStateSnapshot }) {
  return (
    <p className="text-sm text-muted-foreground">
      {formatCurrency(state.amount, state.currency)} · {state.splitMode} · Paid by {state.payerName}
    </p>
  );
}

function DeltaContent({ delta }: { delta: ExpenseDelta }) {
  const hasChanges = delta.title || delta.amount || delta.currency ||
    delta.payerName || delta.splitMode || delta.date || delta.splits;

  if (!hasChanges) {
    return <p className="text-sm text-muted-foreground">No visible changes.</p>;
  }

  return (
    <div className="space-y-1">
      {delta.title && <DiffRow label="Description" before={delta.title.from} after={delta.title.to} />}
      {delta.amount && <DiffRow label="Amount" before={delta.amount.from} after={delta.amount.to} />}
      {delta.currency && <DiffRow label="Currency" before={delta.currency.from} after={delta.currency.to} />}
      {delta.payerName && <DiffRow label="Paid by" before={delta.payerName.from} after={delta.payerName.to} />}
      {delta.splitMode && <DiffRow label="Split mode" before={delta.splitMode.from} after={delta.splitMode.to} />}
      {delta.date && (
        <DiffRow
          label="Date"
          before={new Date(delta.date.from).toLocaleDateString()}
          after={new Date(delta.date.to).toLocaleDateString()}
        />
      )}
      {delta.splits && (
        <DiffRow
          label="Splits"
          before={splitsSummary(delta.splits.from)}
          after={splitsSummary(delta.splits.to)}
        />
      )}
    </div>
  );
}

function EntryContent({ entry }: { entry: ExpenseAuditLogEntry }) {
  const snapshot = entry.snapshot;

  if (snapshot.action === "CREATED") {
    return <p className="text-sm text-muted-foreground">Expense created.</p>;
  }

  if (snapshot.action === "DELETED") {
    return <SnapshotSummary state={snapshot.state} />;
  }

  return <DeltaContent delta={snapshot.delta} />;
}

function ExpenseAuditLogContent({ expenseId }: { expenseId: string }) {
  const [logs, setLogs] = useState<ExpenseAuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getExpenseAuditLog(expenseId)
      .then((result) => {
        if (cancelled) return;

        if (result.error) {
          setError(result.error);
          return;
        }

        setLogs(result.data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load history");
      });

    return () => {
      cancelled = true;
    };
  }, [expenseId]);

  return (
    <div className="px-4 pb-4 space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!logs && !error && (
        <>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </>
      )}
      {logs && logs.length === 0 && (
        <p className="text-sm text-muted-foreground">No history found.</p>
      )}
      {logs && logs.map((entry) => {
        const badge = ACTION_BADGE[entry.action];
        return (
          <div key={entry.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {entry.actor.name}
                </span>
                <Badge className={badge.className}>{badge.label}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
            <EntryContent entry={entry} />
          </div>
        );
      })}
    </div>
  );
}

export function ExpenseAuditLogDialog({ expenseId, expenseTitle, onOpenChange }: Props) {

  return (
    <Sheet open={!!expenseId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>History · {expenseTitle}</SheetTitle>
        </SheetHeader>
        {expenseId ? <ExpenseAuditLogContent key={expenseId} expenseId={expenseId} /> : null}
      </SheetContent>
    </Sheet>
  );
}
