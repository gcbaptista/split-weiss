"use client";
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Copy,
  History,
  ListFilter,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { deleteExpense, revertExpense } from "@/app/actions/expense.actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { ExpenseWithSplitsClient, MemberSummary } from "@/types/database";

import { AddExpenseDialog } from "./add-expense-dialog";
import { ExpenseAuditLogDialog } from "./expense-audit-log-dialog";

type SortBy = "newest" | "oldest" | "highest" | "lowest";
type GroupBy = "none" | "day" | "month" | "week" | "payer";

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
  const [participantFilter, setParticipantFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [showFilters, setShowFilters] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithSplitsClient | null>(null);
  const [duplicatingExpense, setDuplicatingExpense] = useState<ExpenseWithSplitsClient | null>(null);
  const [historyExpenseId, setHistoryExpenseId] = useState<string | null>(null);
  const [historyExpenseTitle, setHistoryExpenseTitle] = useState<string>("");

  const localExpenses = useMemo(
    () => expenses.filter((e) => !pendingDeleteIds.has(e.id)),
    [expenses, pendingDeleteIds]
  );

  // Unique currencies from expenses
  const currencies = useMemo(
    () => [...new Set(localExpenses.map((e) => e.currency))].sort(),
    [localExpenses]
  );

  // Count active filters (excluding search and sort/groupBy)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (onlyMine) count++;
    if (payerFilter !== "all") count++;
    if (participantFilter !== "all") count++;
    if (currencyFilter !== "all") count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [onlyMine, payerFilter, participantFilter, currencyFilter, dateFrom, dateTo]);

  const clearFilters = useCallback(() => {
    setPayerFilter("all");
    setParticipantFilter("all");
    setCurrencyFilter("all");
    setOnlyMine(false);
    setDateFrom("");
    setDateTo("");
  }, []);

  const filteredAndSortedExpenses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = localExpenses.filter((expense) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        expense.title.toLowerCase().includes(normalizedQuery) ||
        expense.amount.toLowerCase().includes(normalizedQuery);

      const matchesPayer = payerFilter === "all" || expense.payerId === payerFilter;

      const matchesParticipant =
        participantFilter === "all" ||
        expense.splits.some((s) => s.userId === participantFilter);

      const matchesCurrency = currencyFilter === "all" || expense.currency === currencyFilter;

      const matchesMine =
        !onlyMine ||
        !currentMemberId ||
        expense.payerId === currentMemberId ||
        expense.splits.some((s) => s.userId === currentMemberId);

      const expenseDate = new Date(expense.date);
      const matchesDateFrom = !dateFrom || expenseDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || expenseDate <= new Date(dateTo + "T23:59:59");

      return (
        matchesQuery &&
        matchesPayer &&
        matchesParticipant &&
        matchesCurrency &&
        matchesMine &&
        matchesDateFrom &&
        matchesDateTo
      );
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "highest":
          return parseFloat(b.amount) - parseFloat(a.amount);
        case "lowest":
          return parseFloat(a.amount) - parseFloat(b.amount);
        case "newest":
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    return filtered;
  }, [
    localExpenses,
    searchQuery,
    payerFilter,
    participantFilter,
    currencyFilter,
    onlyMine,
    currentMemberId,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  // Group expenses
  const groupedExpenses = useMemo(() => {
    if (groupBy === "none") return null;

    const groups = new Map<string, ExpenseWithSplitsClient[]>();

    for (const expense of filteredAndSortedExpenses) {
      const date = new Date(expense.date);
      let key: string;

      if (groupBy === "payer") {
        key = expense.payerId;
      } else if (groupBy === "day") {
        key = date.toISOString().slice(0, 10);
      } else if (groupBy === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else {
        // Week: get Monday of the week
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        key = d.toISOString().slice(0, 10);
      }

      const existing = groups.get(key);
      if (existing) {
        existing.push(expense);
      } else {
        groups.set(key, [expense]);
      }
    }

    return groups;
  }, [filteredAndSortedExpenses, groupBy]);

  const selectedPayer = members.find((member) => member.id === payerFilter);
  const selectedParticipant = members.find((member) => member.id === participantFilter);

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

  function formatGroupLabel(key: string): string {
    if (groupBy === "payer") {
      return members.find((m) => m.id === key)?.name ?? key;
    }
    if (groupBy === "day") {
      return formatDate(key, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }
    if (groupBy === "month") {
      const [year, month] = key.split("-");
      return formatDate(new Date(Number(year), Number(month) - 1), {
        year: "numeric",
        month: "long",
      });
    }
    // Week: key is the Monday date
    const weekStart = new Date(key);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return `${formatDate(weekStart, { month: "short", day: "numeric" })} – ${formatDate(weekEnd, { month: "short", day: "numeric", year: "numeric" })}`;
  }

  const renderExpenseItem = (e: ExpenseWithSplitsClient) => (
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
          {formatDate(e.date)}
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
  );

  const renderExpenseList = () => {
    if (filteredAndSortedExpenses.length === 0) {
      return (
        <EmptyState
          icon="🔎"
          title={t("noMatching")}
          description={t("noMatchingDescription")}
        />
      );
    }

    if (groupedExpenses) {
      return (
        <div className="space-y-6">
          {[...groupedExpenses.entries()].map(([key, items]) => (
            <section key={key}>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {formatGroupLabel(key)}
              </h3>
              <ul className="space-y-2">
                {items.map(renderExpenseItem)}
              </ul>
            </section>
          ))}
        </div>
      );
    }

    return (
      <ul className="space-y-2">
        {filteredAndSortedExpenses.map(renderExpenseItem)}
      </ul>
    );
  };

  return (
    <>
      {/* Row 1: Search + Sort/Group controls */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="h-10 sm:flex-1"
        />
        <div className="flex gap-2">
          {/* Sort */}
          <Select value={sortBy} onValueChange={(value) => setSortBy((value ?? "newest") as SortBy)}>
            <SelectTrigger className="h-10 w-full sm:w-44" aria-label="Sort expenses">
              <SelectValue>
                {sortBy === "newest" || sortBy === "oldest" ? (
                  <ArrowDownNarrowWide className="mr-1.5 inline h-3.5 w-3.5" />
                ) : (
                  <ArrowUpNarrowWide className="mr-1.5 inline h-3.5 w-3.5" />
                )}
                {t(`sort${sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}` as "sortNewest")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("sortNewest")}</SelectItem>
              <SelectItem value="oldest">{t("sortOldest")}</SelectItem>
              <SelectItem value="highest">{t("sortHighest")}</SelectItem>
              <SelectItem value="lowest">{t("sortLowest")}</SelectItem>
            </SelectContent>
          </Select>
          {/* Group by */}
          <Select value={groupBy} onValueChange={(value) => setGroupBy((value ?? "none") as GroupBy)}>
            <SelectTrigger className="h-10 w-full sm:w-40" aria-label="Group expenses">
              <SelectValue>{t(`groupBy${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}` as "groupByNone")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("groupByNone")}</SelectItem>
              <SelectItem value="day">{t("groupByDay")}</SelectItem>
              <SelectItem value="month">{t("groupByMonth")}</SelectItem>
              <SelectItem value="week">{t("groupByWeek")}</SelectItem>
              <SelectItem value="payer">{t("groupByPayer")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Filter toggle + active filter badges */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="h-8 gap-1.5"
        >
          <ListFilter className="h-3.5 w-3.5" />
          {t("moreFilters")}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs text-muted-foreground">
            <X className="h-3 w-3" />
            {t("clearFilters")}
          </Button>
        )}
        {/* Legend dots */}
        {currentMemberId && (
          <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
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
      </div>

      {/* Collapsible filters panel */}
      {showFilters && (
        <div className="mb-4 rounded-lg border bg-muted/30 p-3 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            {/* Only mine toggle */}
            {currentMemberId && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch
                  checked={onlyMine}
                  onCheckedChange={setOnlyMine}
                  size="sm"
                />
                {t("onlyMine")}
              </label>
            )}

            {/* Payer filter */}
            <Select value={payerFilter} onValueChange={(value) => setPayerFilter(value ?? "all")}>
              <SelectTrigger className="h-9 w-full sm:w-44" aria-label="Filter by payer">
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

            {/* Participant filter */}
            <Select value={participantFilter} onValueChange={(value) => setParticipantFilter(value ?? "all")}>
              <SelectTrigger className="h-9 w-full sm:w-44" aria-label="Filter by participant">
                <SelectValue>{selectedParticipant?.name ?? t("allParticipants")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allParticipants")}</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Currency filter */}
            {currencies.length > 1 && (
              <Select value={currencyFilter} onValueChange={(value) => setCurrencyFilter(value ?? "all")}>
                <SelectTrigger className="h-9 w-full sm:w-32" aria-label="Filter by currency">
                  <SelectValue>{currencyFilter === "all" ? t("allCurrencies") : currencyFilter}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allCurrencies")}</SelectItem>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Date range */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-xs text-muted-foreground shrink-0">{t("fromDate")}</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-full sm:w-40"
            />
            <label className="text-xs text-muted-foreground shrink-0">{t("toDate")}</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-full sm:w-40"
            />
          </div>
        </div>
      )}

      {/* Expense list */}
      {renderExpenseList()}

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
