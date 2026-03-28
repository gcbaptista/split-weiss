"use client";

import { ArrowDownNarrowWide, ArrowUpNarrowWide, ListFilter, X } from "lucide-react";
import type { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { GroupBy, SortBy } from "@/hooks/use-expense-filters";
import type { MemberSummary } from "@/types/database";

interface ExpenseFilterPanelProps {
  t: ReturnType<typeof useTranslations<"expenses">>;
  members: MemberSummary[];
  currentMemberId?: string;
  // Search & sort
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  groupBy: GroupBy;
  setGroupBy: (v: GroupBy) => void;
  // Filter panel visibility
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  activeFilterCount: number;
  clearFilters: () => void;
  // Filters
  payerFilter: string;
  setPayerFilter: (v: string) => void;
  participantFilter: string;
  setParticipantFilter: (v: string) => void;
  currencyFilter: string;
  setCurrencyFilter: (v: string) => void;
  onlyMine: boolean;
  setOnlyMine: (v: boolean) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  currencies: string[];
}

export function ExpenseFilterPanel({
  t,
  members,
  currentMemberId,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  groupBy,
  setGroupBy,
  showFilters,
  setShowFilters,
  activeFilterCount,
  clearFilters,
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
  currencies,
}: ExpenseFilterPanelProps) {
  const selectedPayer = members.find((m) => m.id === payerFilter);
  const selectedParticipant = members.find((m) => m.id === participantFilter);

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
          <Select value={sortBy} onValueChange={(v) => setSortBy((v ?? "newest") as SortBy)}>
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
          <Select value={groupBy} onValueChange={(v) => setGroupBy((v ?? "none") as GroupBy)}>
            <SelectTrigger className="h-10 w-full sm:w-40" aria-label="Group expenses">
              <SelectValue>
                {t(`groupBy${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}` as "groupByNone")}
              </SelectValue>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 gap-1 text-xs text-muted-foreground"
          >
            <X className="h-3 w-3" />
            {t("clearFilters")}
          </Button>
        )}
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
            {currentMemberId && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={onlyMine} onCheckedChange={setOnlyMine} size="sm" />
                {t("onlyMine")}
              </label>
            )}
            <Select value={payerFilter} onValueChange={(v) => setPayerFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-full sm:w-44" aria-label="Filter by payer">
                <SelectValue>{selectedPayer?.name ?? t("allPayers")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allPayers")}</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={participantFilter}
              onValueChange={(v) => setParticipantFilter(v ?? "all")}
            >
              <SelectTrigger className="h-9 w-full sm:w-44" aria-label="Filter by participant">
                <SelectValue>{selectedParticipant?.name ?? t("allParticipants")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allParticipants")}</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currencies.length > 1 && (
              <Select value={currencyFilter} onValueChange={(v) => setCurrencyFilter(v ?? "all")}>
                <SelectTrigger className="h-9 w-full sm:w-32" aria-label="Filter by currency">
                  <SelectValue>
                    {currencyFilter === "all" ? t("allCurrencies") : currencyFilter}
                  </SelectValue>
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
    </>
  );
}
