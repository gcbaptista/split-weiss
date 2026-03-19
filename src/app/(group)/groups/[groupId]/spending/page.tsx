import { getAuthorizedGroup } from "@/lib/group-access";
import { getGroupExpenses } from "@/app/actions/expense.actions";
import { notFound } from "next/navigation";
import { fetchRates } from "@/lib/currency/frankfurter";
import { convert } from "@/lib/currency/converter";
import { MemberSpendingBreakdown } from "@/components/groups/member-spending-breakdown";
import { EmptyState } from "@/components/shared/empty-state";
import { AlertTriangle } from "lucide-react";
import Decimal from "decimal.js";
import type { ExchangeRates } from "@/types/currency";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function SpendingPage({ params }: PageProps) {
  const { groupId } = await params;
  const [group, expenses] = await Promise.all([
    getAuthorizedGroup(groupId),
    getGroupExpenses(groupId),
  ]);

  if (!group) notFound();
  if (expenses.length === 0) {
    return (
      <EmptyState
        icon="💰"
        title="No spending yet"
        description="Add expenses to see spending breakdown."
      />
    );
  }

  const groupCurrency = group.currency;

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

  function getRates(date: Date): ExchangeRates {
    const day = date.toISOString().split("T")[0];
    return ratesByDate.get(day) ?? ratesByDate.get("latest") ?? { base: groupCurrency, date: "latest", rates: {} };
  }

  let grandTotal = new Decimal(0);
  const paidMap = new Map<string, Decimal>();
  const shareMap = new Map<string, Decimal>();
  const members = group.members.map((member) => member.user);

  for (const expense of expenses) {
    const rates = getRates(expense.date);
    const convertedAmount = convert(expense.amount.toString(), expense.currency, group.currency, rates);
    grandTotal = grandTotal.plus(convertedAmount);
    paidMap.set(expense.payerId, (paidMap.get(expense.payerId) ?? new Decimal(0)).plus(convertedAmount));

    for (const split of expense.splits) {
      const convertedShare = convert(split.amount.toString(), expense.currency, group.currency, rates);
      shareMap.set(split.userId, (shareMap.get(split.userId) ?? new Decimal(0)).plus(convertedShare));
    }
  }

  const hasStaleRates = staleDateResults.some(Boolean) || latestRatesStale;
  const memberSpend = members.map((member) => ({
    userId: member.id,
    paid: (paidMap.get(member.id) ?? new Decimal(0)).toString(),
    share: (shareMap.get(member.id) ?? new Decimal(0)).toString(),
  }));
  const expensesByMember = new Map(
    members
      .map((member) => [member.id, expenses.filter((expense) => expense.splits.some((split) => split.userId === member.id))] as const)
      .filter(([, memberExpenses]) => memberExpenses.length > 0)
  );

  return (
    <div className="space-y-6">
      {hasStaleRates && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Exchange rates could not be fetched for some dates. Spending may be approximate.
        </div>
      )}

      <MemberSpendingBreakdown
        members={members}
        expensesByMember={expensesByMember}
        memberSpend={memberSpend}
        grandTotal={grandTotal.toString()}
        currency={groupCurrency}
      />
    </div>
  );
}