import Decimal from "decimal.js";
import { AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getGroupExpensesForBreakdown } from "@/app/actions/expense.actions";
import { getGroupSettlementsForBreakdown } from "@/app/actions/settlement.actions";
import { BalanceBreakdown } from "@/components/groups/balance-breakdown";
import { EmptyState } from "@/components/shared/empty-state";
import { calculateBalances } from "@/lib/balances/calculator";
import { convert } from "@/lib/currency/converter";
import { fetchRatesMap } from "@/lib/currency/frankfurter";
import { getAuthorizedGroup } from "@/lib/group-access";
import type { ExchangeRates } from "@/types/currency";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function BalancesPage({ params }: PageProps) {
  const { groupId } = await params;
  const [group, expenses, settlements, t] = await Promise.all([
    getAuthorizedGroup(groupId),
    getGroupExpensesForBreakdown(groupId),
    getGroupSettlementsForBreakdown(groupId),
    getTranslations("balances"),
  ]);

  if (!group) notFound();

  const groupCurrency = group.currency;
  const members = group.members;

  if (expenses.length === 0) {
    return (
      <EmptyState icon="⚖️" title={t("noExpenses")} description={t("noExpensesDescription")} />
    );
  }

  const dates = [
    ...new Set([...expenses, ...settlements].map((item) => item.date.toISOString().slice(0, 10))),
  ];
  const { ratesByDate, staleDates } = await fetchRatesMap(groupCurrency, [...dates, "latest"]);

  function getRates(date: Date): ExchangeRates {
    const day = date.toISOString().slice(0, 10);
    return (
      ratesByDate.get(day) ??
      ratesByDate.get("latest") ?? { base: groupCurrency, date: "latest", rates: {} }
    );
  }

  // Calculate spending totals
  let grandTotal = new Decimal(0);
  const paidMap = new Map<string, Decimal>();
  const shareMap = new Map<string, Decimal>();

  for (const expense of expenses) {
    const rates = getRates(expense.date);
    const convertedAmount = convert(
      expense.amount.toString(),
      expense.currency,
      groupCurrency,
      rates
    );
    grandTotal = grandTotal.plus(convertedAmount);
    paidMap.set(
      expense.payerId,
      (paidMap.get(expense.payerId) ?? new Decimal(0)).plus(convertedAmount)
    );

    for (const split of expense.splits) {
      const convertedShare = convert(
        split.amount.toString(),
        expense.currency,
        groupCurrency,
        rates
      );
      shareMap.set(
        split.userId,
        (shareMap.get(split.userId) ?? new Decimal(0)).plus(convertedShare)
      );
    }
  }

  const memberSpend = members.map((member) => ({
    userId: member.id,
    paid: (paidMap.get(member.id) ?? new Decimal(0)).toString(),
    share: (shareMap.get(member.id) ?? new Decimal(0)).toString(),
  }));

  // Calculate balances
  const balances = calculateBalances(expenses, settlements, groupCurrency, ratesByDate);
  const allBalances = [...balances.values()].map((balance) => ({
    userId: balance.userId,
    netAmount: balance.netAmount.toString(),
  }));
  const hasStaleRates = staleDates.length > 0;

  return (
    <div className="space-y-6">
      {hasStaleRates && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t("staleRatesWarning")}
        </div>
      )}

      <BalanceBreakdown
        balances={allBalances}
        expenses={expenses}
        settlements={settlements}
        memberSpend={memberSpend}
        grandTotal={grandTotal.toString()}
        ratesByDate={Object.fromEntries(ratesByDate)}
      />
    </div>
  );
}
