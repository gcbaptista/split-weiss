import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { getGroupExpensesForCalculation } from "@/app/actions/expense.actions";
import { getGroupSettlementHistory } from "@/app/actions/settlement.actions";
import { SettlementPairs } from "@/components/settlements/settlement-pairs";
import { EmptyState } from "@/components/shared/empty-state";
import { calculateBalances } from "@/lib/balances/calculator";
import { simplifyDebts } from "@/lib/balances/simplifier";
import { fetchRatesMap } from "@/lib/currency/frankfurter";
import { getAuthorizedGroup, getCurrentMemberId } from "@/lib/group-access";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function SettlementsPage({ params }: PageProps) {
  const { groupId } = await params;
  const [group, expenses, settlements, currentMemberId, t] = await Promise.all([
    getAuthorizedGroup(groupId),
    getGroupExpensesForCalculation(groupId),
    getGroupSettlementHistory(groupId),
    getCurrentMemberId(groupId),
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
  const { ratesByDate } = await fetchRatesMap(group.currency, [...dates, "latest"]);

  const balances = calculateBalances(expenses, settlements, group.currency, ratesByDate);
  const debts = simplifyDebts(balances);
  const userMap = new Map(group.members.map((member) => [member.id, member]));

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
    <SettlementPairs
      debts={debtsWithNames}
      settlements={serializedSettlements}
      groupId={groupId}
      currency={group.currency}
      members={group.members}
      highlightedUserId={currentMemberId ?? undefined}
    />
  );
}
