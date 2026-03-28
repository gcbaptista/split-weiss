import { useCallback, useMemo, useState } from "react";

import type { ExpenseWithSplitsClient } from "@/types/database";

export type SortBy = "newest" | "oldest" | "highest" | "lowest";
export type GroupBy = "none" | "day" | "month" | "week" | "payer";

interface UseExpenseFiltersOptions {
  expenses: ExpenseWithSplitsClient[];
  currentMemberId?: string;
}

export function useExpenseFilters({ expenses, currentMemberId }: UseExpenseFiltersOptions) {
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

  const localExpenses = useMemo(
    () => expenses.filter((e) => !pendingDeleteIds.has(e.id)),
    [expenses, pendingDeleteIds]
  );

  const currencies = useMemo(
    () => [...new Set(localExpenses.map((e) => e.currency))].sort(),
    [localExpenses]
  );

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
        participantFilter === "all" || expense.splits.some((s) => s.userId === participantFilter);
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

  return {
    // Filter state
    searchQuery,
    setSearchQuery,
    payerFilter,
    setPayerFilter,
    participantFilter,
    setParticipantFilter,
    currencyFilter,
    setCurrencyFilter,
    onlyMine,
    setOnlyMine,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortBy,
    setSortBy,
    groupBy,
    setGroupBy,
    showFilters,
    setShowFilters,
    // Optimistic delete support
    pendingDeleteIds,
    setPendingDeleteIds,
    // Derived
    currencies,
    activeFilterCount,
    clearFilters,
    filteredAndSortedExpenses,
    groupedExpenses,
  };
}
