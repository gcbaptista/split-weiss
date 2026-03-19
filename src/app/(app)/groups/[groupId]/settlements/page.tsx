import { getGroup } from "@/app/actions/group.actions";
import { getGroupExpenses } from "@/app/actions/expense.actions";
import { getGroupSettlements } from "@/app/actions/settlement.actions";
import { auth } from "@/lib/auth";
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
  const session = await auth();
  const [group, expenses, settlements] = await Promise.all([
    getGroup(groupId),
    getGroupExpenses(groupId),
    getGroupSettlements(groupId),
  ]);
  if (!group || !session?.user?.id) notFound();

  const dates = [
    ...new Set(expenses.map((e) => e.date.toISOString().split("T")[0])),
  ];
  const ratesByDate = new Map<string, ExchangeRates>();
  await Promise.all(
    dates.map(async (d) => {
      try {
        ratesByDate.set(d, await fetchRates(group.currency, d));
      } catch {}
    })
  );
  try {
    ratesByDate.set("latest", await fetchRates(group.currency, "latest"));
  } catch {}

  const balances = calculateBalances(expenses, settlements, group.currency, ratesByDate);
  const debts = simplifyDebts(balances);
  const userMap = new Map(group.members.map((m) => [m.userId, m.user]));
  const members = group.members.map((m) => m.user);
  const currentUserId = session.user.id;

  const debtsWithNames = debts.map((d) => ({
    fromUserId: d.fromUserId,
    fromName: userMap.get(d.fromUserId)?.name ?? userMap.get(d.fromUserId)?.email ?? "?",
    toUserId: d.toUserId,
    toName: userMap.get(d.toUserId)?.name ?? userMap.get(d.toUserId)?.email ?? "?",
    amount: d.amount.toString(),
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
            members={members}
            currentUserId={currentUserId}
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
