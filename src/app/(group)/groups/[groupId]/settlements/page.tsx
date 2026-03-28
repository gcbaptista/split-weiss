import { AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { getGroupExpensesForCalculation } from "@/app/actions/expense.actions";
import { getGroupSettlementHistory } from "@/app/actions/settlement.actions";
import { SettlementPairs } from "@/components/settlements/settlement-pairs";
import { EmptyState } from "@/components/shared/empty-state";
import { calculateBalances } from "@/lib/balances/calculator";
import { simplifyDebts } from "@/lib/balances/simplifier";
import { fetchRatesMap } from "@/lib/currency/frankfurter";
import { getAuthorizedGroup } from "@/lib/group-access";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function SettlementsPage({ params }: PageProps) {
  const { groupId } = await params;
  const [group, expenses, settlements, t] = await Promise.all([
    getAuthorizedGroup(groupId),
    getGroupExpensesForCalculation(groupId),
    getGroupSettlementHistory(groupId),
    getTranslations("settlements"),
  ]);

  if (!group) notFound();

  if (group.members.length < 2) {
    return (
      <EmptyState
        icon="🤝"
        title={t("needAtLeast2")}
        description={t("needAtLeast2Description")}
      />
    );
  }

  const dates = [
    ...new Set([...expenses, ...settlements].map((item) => item.date.toISOString().slice(0, 10))),
  ];
  const { ratesByDate, staleDates } = await fetchRatesMap(group.currency, [...dates, "latest"]);

  const balances = calculateBalances(expenses, settlements, group.currency, ratesByDate);
  const debts = simplifyDebts(balances);
  const userMap = new Map(group.members.map((member) => [member.id, member]));
  const hasStaleRates = staleDates.length > 0;

  const debtsWithNames = debts.map((debt) => ({
    fromUserId: debt.fromUserId,
    fromName: userMap.get(debt.fromUserId)?.name ?? "?",
    toUserId: debt.toUserId,
    toName: userMap.get(debt.toUserId)?.name ?? "?",
    amount: debt.amount.toString(),
  }));

  const serializedSettlements = settlements.map((s) => ({
    ...s,
    amount: s.amount.toString(),
  }));

  return (
    <div className="space-y-6">
      {hasStaleRates && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t("staleRatesWarning")}
        </div>
      )}
      <SettlementPairs
        debts={debtsWithNames}
        settlements={serializedSettlements}
      />
    </div>
  );
}
