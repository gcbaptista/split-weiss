import { getGroup } from "@/app/actions/group.actions";
import { getGroupExpenses } from "@/app/actions/expense.actions";
import { getGroupSettlements } from "@/app/actions/settlement.actions";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { calculateBalances } from "@/lib/balances/calculator";
import { simplifyDebts } from "@/lib/balances/simplifier";
import { fetchRates } from "@/lib/currency/frankfurter";
import { BalanceCard } from "@/components/groups/balance-card";
import { DebtList } from "@/components/groups/debt-list";
import { EmptyState } from "@/components/shared/empty-state";
import type { ExchangeRates } from "@/types/currency";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function BalancesPage({ params }: PageProps) {
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

  const balances = calculateBalances(
    expenses,
    settlements,
    group.currency,
    ratesByDate
  );
  const debts = simplifyDebts(balances);
  const userMap = new Map(group.members.map((m) => [m.userId, m.user]));
  const members = group.members.map((m) => m.user);

  const debtsWithNames = debts.map((d) => ({
    fromUserId: d.fromUserId,
    fromName:
      userMap.get(d.fromUserId)?.name ??
      userMap.get(d.fromUserId)?.email ??
      "?",
    toUserId: d.toUserId,
    toName:
      userMap.get(d.toUserId)?.name ??
      userMap.get(d.toUserId)?.email ??
      "?",
    amount: d.amount.toString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 font-semibold">Net balances</h2>
        {balances.size === 0 ? (
          <EmptyState
            icon="⚖️"
            title="No balances"
            description="Add expenses to see balances."
          />
        ) : (
          <div className="space-y-2">
            {[...balances.values()].map((b) => {
              const user = userMap.get(b.userId);
              if (!user) return null;
              return (
                <BalanceCard
                  key={b.userId}
                  balance={b}
                  user={user}
                  currency={group.currency}
                />
              );
            })}
          </div>
        )}
      </div>
      {debtsWithNames.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold">Suggested settlements</h2>
          <DebtList
            debts={debtsWithNames}
            groupId={groupId}
            currency={group.currency}
            members={members}
          />
        </div>
      )}
    </div>
  );
}
