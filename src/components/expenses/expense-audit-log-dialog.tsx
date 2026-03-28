"use client";
import { Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getExpenseAuditLog, revertExpense } from "@/app/actions/expense.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { ExpenseAuditLogEntry, ExpenseDelta, ExpenseStateSnapshot } from "@/types/audit";

interface Props {
  expenseId: string | null;
  expenseTitle: string;
  onOpenChange: (open: boolean) => void;
}

const ACTION_BADGE_CLASSNAME: Record<string, string> = {
  CREATED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  UPDATED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DELETED: "bg-destructive/10 text-destructive",
  REVERTED: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
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
  return splits.map((s) => `${s.userName}: ${s.amount}`).join(", ");
}

function SnapshotSummary({ state }: { state: ExpenseStateSnapshot }) {
  return (
    <p className="text-sm text-muted-foreground">
      {formatCurrency(state.amount, state.currency)} · {state.splitMode} · Paid by {state.payerName}
    </p>
  );
}

function DeltaContent({ delta }: { delta: ExpenseDelta }) {
  const ta = useTranslations("audit");
  const hasChanges =
    delta.title ||
    delta.amount ||
    delta.currency ||
    delta.payerName ||
    delta.splitMode ||
    delta.date ||
    delta.splits;

  if (!hasChanges) {
    return <p className="text-sm text-muted-foreground">{ta("noVisibleChanges")}</p>;
  }

  return (
    <div className="space-y-1">
      {delta.title && (
        <DiffRow label={ta("descriptionLabel")} before={delta.title.from} after={delta.title.to} />
      )}
      {delta.amount && (
        <DiffRow label={ta("amountLabel")} before={delta.amount.from} after={delta.amount.to} />
      )}
      {delta.currency && (
        <DiffRow
          label={ta("currencyLabel")}
          before={delta.currency.from}
          after={delta.currency.to}
        />
      )}
      {delta.payerName && (
        <DiffRow
          label={ta("paidByLabel")}
          before={delta.payerName.from}
          after={delta.payerName.to}
        />
      )}
      {delta.splitMode && (
        <DiffRow
          label={ta("splitModeLabel")}
          before={delta.splitMode.from}
          after={delta.splitMode.to}
        />
      )}
      {delta.date && (
        <DiffRow
          label={ta("dateLabel")}
          before={formatDate(delta.date.from)}
          after={formatDate(delta.date.to)}
        />
      )}
      {delta.splits && (
        <DiffRow
          label={ta("splitsLabel")}
          before={splitsSummary(delta.splits.from)}
          after={splitsSummary(delta.splits.to)}
        />
      )}
    </div>
  );
}

function EntryContent({ entry }: { entry: ExpenseAuditLogEntry }) {
  const ta = useTranslations("audit");
  const snapshot = entry.snapshot;

  if (snapshot.action === "CREATED") {
    return <p className="text-sm text-muted-foreground">{ta("expenseCreated")}</p>;
  }

  if (snapshot.action === "DELETED") {
    return <SnapshotSummary state={snapshot.state} />;
  }

  if (snapshot.action === "REVERTED") {
    const delta = snapshot.delta;
    const hasChanges =
      delta.title ||
      delta.amount ||
      delta.currency ||
      delta.payerName ||
      delta.splitMode ||
      delta.date ||
      delta.splits;
    if (!hasChanges) {
      return <p className="text-sm text-muted-foreground">{ta("revertedToPrevious")}</p>;
    }
    return <DeltaContent delta={delta} />;
  }

  return <DeltaContent delta={snapshot.delta} />;
}

function ExpenseAuditLogContent({ expenseId }: { expenseId: string }) {
  const tc = useTranslations("common");
  const ta = useTranslations("audit");
  const [logs, setLogs] = useState<ExpenseAuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reverting, setReverting] = useState<string | null>(null);
  const router = useRouter();

  const actionLabels: Record<string, string> = {
    CREATED: ta("created"),
    UPDATED: ta("updated"),
    DELETED: ta("deleted"),
    REVERTED: ta("reverted"),
  };

  function loadLogs() {
    void getExpenseAuditLog(expenseId)
      .then((result) => {
        if (result.error) {
          setError(result.error);
          return;
        }
        setLogs(result.data ?? []);
      })
      .catch(() => {
        setError(tc("failedToLoadHistory"));
      });
  }

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseId]);

  async function handleRevert(entryId: string) {
    setReverting(entryId);
    const result = await revertExpense(entryId);
    setReverting(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(tc("reverted"));
    router.refresh();
    loadLogs();
  }

  const canRevert = (entry: ExpenseAuditLogEntry) =>
    entry.action === "UPDATED" || entry.action === "DELETED";

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
        <p className="text-sm text-muted-foreground">{tc("noHistoryFound")}</p>
      )}
      {logs &&
        logs.map((entry) => {
          const label = actionLabels[entry.action] ?? entry.action;
          const badgeClass = ACTION_BADGE_CLASSNAME[entry.action] ?? "";
          return (
            <div key={entry.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {entry.actor && <span className="text-sm font-medium">{entry.actor.name}</span>}
                  <Badge className={badgeClass}>{label}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                </span>
              </div>
              <EntryContent entry={entry} />
              {canRevert(entry) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  disabled={reverting !== null}
                  onClick={() => handleRevert(entry.id)}
                  aria-label="Revert this change"
                >
                  <Undo2 className={`h-4 w-4 ${reverting === entry.id ? "animate-spin" : ""}`} />
                </Button>
              )}
            </div>
          );
        })}
    </div>
  );
}

export function ExpenseAuditLogDialog({ expenseId, expenseTitle, onOpenChange }: Props) {
  const tc = useTranslations("common");
  return (
    <Sheet open={!!expenseId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{tc("historyTitle", { title: expenseTitle })}</SheetTitle>
        </SheetHeader>
        {expenseId ? <ExpenseAuditLogContent key={expenseId} expenseId={expenseId} /> : null}
      </SheetContent>
    </Sheet>
  );
}
