import { getAuthorizedGroup } from "@/lib/group-access";
import { getGroupExpensesForCalculation } from "@/app/actions/expense.actions";
import { getGroupSettlementHistory } from "@/app/actions/settlement.actions";
import { notFound } from "next/navigation";
import { calculateBalances } from "@/lib/balances/calculator";
import { simplifyDebts } from "@/lib/balances/simplifier";
import { fetchRatesMap } from "@/lib/currency/frankfurter";
import { SettlementPairs } from "@/components/settlements/settlement-pairs";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function SettlementsPage({ params }: PageProps) {
  const { groupId } = await params;
  const [group, expenses, settlements] = await Promise.all([
    getAuthorizedGroup(groupId),
    getGroupExpensesForCalculation(groupId),
    getGroupSettlementHistory(groupId),
  ]);

  if (!group) notFound();

  const dates = [
    ...new Set(
      [...expenses, ...settlements].map((item) => item.date.toISOString().split("T")[0])
    ),
  ];
  const { ratesByDate } = await fetchRatesMap(group.currency, [...dates, "latest"]);

  const balances = calculateBalances(expenses, settlements, group.currency, ratesByDate);
  const debts = simplifyDebts(balances);
  const userMap = new Map(group.members.map((member) => [member.userId, member.user]));

  const debtsWithNames = debts.map((debt) => ({
    fromUserId: debt.fromUserId,
    fromName: userMap.get(debt.fromUserId)?.name ?? userMap.get(debt.fromUserId)?.email ?? "?",
    toUserId: debt.toUserId,
    toName: userMap.get(debt.toUserId)?.name ?? userMap.get(debt.toUserId)?.email ?? "?",
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
      members={group.members.map((member) => member.user)}
    />
  );
}