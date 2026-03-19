import { getAuthorizedGroup } from "@/lib/group-access";
import { getGroupExpenses } from "@/app/actions/expense.actions";
import { getGroupSettlements } from "@/app/actions/settlement.actions";
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
  const [group, expenses, settlements] = await Promise.all([
    getAuthorizedGroup(groupId),
    getGroupExpenses(groupId),
    getGroupSettlements(groupId),
  ]);

  if (!group) notFound();

  const dates = [...new Set(expenses.map((expense) => expense.date.toISOString().split("T")[0]))];
  const ratesByDate = new Map<string, ExchangeRates>();
  const staleDateResults = await Promise.all(
    dates.map(async (date) => {
      try {
        ratesByDate.set(date, await fetchRates(group.currency, date));
        return false;
      } catch {
        return true;
      }
    })
  );

  const latestRatesStale = await (async () => {
    try {
      ratesByDate.set("latest", await fetchRates(group.currency, "latest"));
      return false;
    } catch {
      return true;
    }
  })();

  const balances = calculateBalances(expenses, settlements, group.currency, ratesByDate);
  const allBalances = [...balances.values()].map((balance) => ({
    userId: balance.userId,
    netAmount: balance.netAmount.toString(),
  }));
  const hasStaleRates = staleDateResults.some(Boolean) || latestRatesStale;

  return (
    <div className="space-y-6">
      {hasStaleRates && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Exchange rates could not be fetched for some dates. Balances may be approximate.
        </div>
      )}

      {allBalances.length === 0 ? (
        <EmptyState icon="⚖️" title="No balances" description="Add expenses to see balances." />
      ) : (
        <BalanceBreakdown
          balances={allBalances}
          members={group.members.map((member) => member.user)}
          expenses={expenses}
          settlements={settlements}
          currency={group.currency}
        />
      )}
    </div>
  );
}