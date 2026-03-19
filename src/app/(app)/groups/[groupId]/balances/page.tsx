import { getGroup } from "@/app/actions/group.actions";
import { getGroupExpenses } from "@/app/actions/expense.actions";
import { getGroupSettlements } from "@/app/actions/settlement.actions";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { calculateBalances } from "@/lib/balances/calculator";
import { fetchRates } from "@/lib/currency/frankfurter";
import { BalanceBreakdown } from "@/components/groups/balance-breakdown";
import { EmptyState } from "@/components/shared/empty-state";
import { AlertTriangle } from "lucide-react";
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
  let hasStaleRates = false;

  await Promise.all(
    dates.map(async (d) => {
      try {
        ratesByDate.set(d, await fetchRates(group.currency, d));
      } catch {
        hasStaleRates = true;
      }
    })
  );
  try {
    ratesByDate.set("latest", await fetchRates(group.currency, "latest"));
  } catch {
    hasStaleRates = true;
  }

  const balances = calculateBalances(
    expenses,
    settlements,
    group.currency,
    ratesByDate
  );
  const members = group.members.map((m) => m.user);
  const currentUserId = session.user.id;
  const allBalances = [...balances.values()];

  return (
    <div className="space-y-6">
      {hasStaleRates && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Exchange rates could not be fetched for some dates. Balances may be approximate.
        </div>
      )}

      {allBalances.length === 0 ? (
        <EmptyState
          icon="⚖️"
          title="No balances"
          description="Add expenses to see balances."
        />
      ) : (
        <BalanceBreakdown
          balances={allBalances}
          members={members}
          expenses={expenses}
          settlements={settlements}
          currency={group.currency}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
