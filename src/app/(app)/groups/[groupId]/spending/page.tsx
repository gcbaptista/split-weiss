import { getGroup } from "@/app/actions/group.actions";
import { getGroupExpenses } from "@/app/actions/expense.actions";
import { auth } from "@/lib/auth";
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
  const session = await auth();
  const [group, expenses] = await Promise.all([
    getGroup(groupId),
    getGroupExpenses(groupId),
  ]);
  if (!group || !session?.user?.id) notFound();

  // If no expenses, show empty state
  if (expenses.length === 0) {
    return (
      <EmptyState
        icon="💰"
        title="No spending yet"
        description="Add expenses to see spending breakdown."
      />
    );
  }

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

  const members = group.members.map((m) => m.user);

  // Spending stats
  function getRates(date: Date): ExchangeRates {
    const d = date.toISOString().split("T")[0];
    return (
      ratesByDate.get(d) ??
      ratesByDate.get("latest") ?? {
        base: group!.currency,
        date: "latest",
        rates: {},
      }
    );
  }

  let grandTotal = new Decimal(0);
  const paidMap = new Map<string, Decimal>();
  const shareMap = new Map<string, Decimal>();

  for (const e of expenses) {
    const rates = getRates(e.date);
    const amt = convert(e.amount.toString(), e.currency, group.currency, rates);
    grandTotal = grandTotal.plus(amt);
    paidMap.set(e.payerId, (paidMap.get(e.payerId) ?? new Decimal(0)).plus(amt));
    for (const s of e.splits) {
      const share = convert(
        s.amount.toString(),
        e.currency,
        group.currency,
        rates
      );
      shareMap.set(s.userId, (shareMap.get(s.userId) ?? new Decimal(0)).plus(share));
    }
  }

  const memberSpend = members.map((m) => ({
    userId: m.id,
    paid: (paidMap.get(m.id) ?? new Decimal(0)).toString(),
    share: (shareMap.get(m.id) ?? new Decimal(0)).toString(),
  }));

  // Group expenses by participation (where member has a share)
  const expensesByMember = new Map();
  for (const member of members) {
    const memberExpenses = expenses.filter((e) =>
      e.splits.some((s) => s.userId === member.id)
    );
    if (memberExpenses.length > 0) {
      expensesByMember.set(member.id, memberExpenses);
    }
  }

  const currentUserId = session.user.id;

  return (
    <div className="space-y-6">
      {hasStaleRates && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Exchange rates could not be fetched for some dates. Spending may be
          approximate.
        </div>
      )}

      <MemberSpendingBreakdown
        members={members}
        expensesByMember={expensesByMember}
        memberSpend={memberSpend}
        grandTotal={grandTotal.toString()}
        currency={group.currency}
        currentUserId={currentUserId}
      />
    </div>
  );
}

