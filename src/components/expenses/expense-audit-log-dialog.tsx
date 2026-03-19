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
import type { ExpenseAuditLogEntry, ExpenseStateSnapshot } from "@/types/audit";

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

function EntryContent({ entry }: { entry: ExpenseAuditLogEntry }) {
  const { snapshot } = entry;
  if (snapshot.action === "CREATED") {
    return <SnapshotSummary state={snapshot.after} />;
  }
  if (snapshot.action === "DELETED") {
    return <SnapshotSummary state={snapshot.before} />;
  }
  const { before, after } = snapshot;
  const splitsBefore = splitsSummary(before.splits);
  const splitsAfter = splitsSummary(after.splits);
  const hasDiffs =
    before.title !== after.title ||
    before.amount !== after.amount ||
    before.currency !== after.currency ||
    before.payerName !== after.payerName ||
    before.splitMode !== after.splitMode ||
    before.date !== after.date ||
    splitsBefore !== splitsAfter;

  if (!hasDiffs) {
    return <p className="text-sm text-muted-foreground">No visible changes.</p>;
  }
  return (
    <div className="space-y-1">
      <DiffRow label="Description" before={before.title} after={after.title} />
      <DiffRow
        label="Amount"
        before={formatCurrency(before.amount, before.currency)}
        after={formatCurrency(after.amount, after.currency)}
      />
      <DiffRow label="Paid by" before={before.payerName} after={after.payerName} />
      <DiffRow label="Split mode" before={before.splitMode} after={after.splitMode} />
      <DiffRow
        label="Date"
        before={new Date(before.date).toLocaleDateString()}
        after={new Date(after.date).toLocaleDateString()}
      />
      <DiffRow label="Splits" before={splitsBefore} after={splitsAfter} />
    </div>
  );
}

export function ExpenseAuditLogDialog({ expenseId, expenseTitle, onOpenChange }: Props) {
  const [logs, setLogs] = useState<ExpenseAuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expenseId) {
      setLogs(null);
      setError(null);
      return;
    }
    setLogs(null);
    setError(null);
    getExpenseAuditLog(expenseId).then((result) => {
      if (result.error) {
        setError(result.error);
      } else {
        setLogs(result.data ?? []);
      }
    });
  }, [expenseId]);

  return (
    <Sheet open={!!expenseId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>History · {expenseTitle}</SheetTitle>
        </SheetHeader>
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
                      {entry.actor.name ?? entry.actor.email}
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
      </SheetContent>
    </Sheet>
  );
}
