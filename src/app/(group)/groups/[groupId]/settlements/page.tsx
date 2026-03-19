import { getAuthorizedGroup } from "@/lib/group-access";
import { getGroupExpenses } from "@/app/actions/expense.actions";
import { getGroupSettlements } from "@/app/actions/settlement.actions";
import { notFound } from "next/navigation";
import { calculateBalances } from "@/lib/balances/calculator";
import { simplifyDebts } from "@/lib/balances/simplifier";
import { fetchRates } from "@/lib/currency/frankfurter";
import { DebtList } from "@/components/groups/debt-list";
import { SettlementList } from "@/components/settlements/settlement-list";
import type { ExchangeRates } from "@/types/currency";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function SettlementsPage({ params }: PageProps) {
  const { groupId } = await params;
  const [group, expenses, settlements] = await Promise.all([
    getAuthorizedGroup(groupId),
    getGroupExpenses(groupId),
    getGroupSettlements(groupId),
  ]);

  if (!group) notFound();

  const ratesByDate = new Map<string, ExchangeRates>();
  const dates = [...new Set(expenses.map((expense) => expense.date.toISOString().split("T")[0]))];

  await Promise.all(
    dates.map(async (date) => {
      try {
        ratesByDate.set(date, await fetchRates(group.currency, date));
      } catch {}
    })
  );

  try {
    ratesByDate.set("latest", await fetchRates(group.currency, "latest"));
  } catch {}

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

  return (
    <div className="space-y-6">
      {debtsWithNames.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold">Suggested settlements</h2>
          <DebtList
            debts={debtsWithNames}
            groupId={groupId}
            currency={group.currency}
            members={group.members.map((member) => member.user)}
          />
        </div>
      )}
      <div>
        <h2 className="mb-4 font-semibold">Settlement history</h2>
        <SettlementList settlements={settlements} />
      </div>
    </div>
  );
}