import Decimal from "decimal.js";
import { notFound } from "next/navigation";

import { getGroupExpenses } from "@/app/actions/expense.actions";
import { ExpenseList } from "@/components/expenses/expense-list";
import { convert } from "@/lib/currency/converter";
import { fetchRates } from "@/lib/currency/frankfurter";
import { getAuthorizedGroup } from "@/lib/group-access";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupExpensesPage({ params }: PageProps) {
  const { groupId } = await params;
  const [group, expenses] = await Promise.all([
    getAuthorizedGroup(groupId),
    getGroupExpenses(groupId),
  ]);

  if (!group) notFound();

  // Compute converted amounts for expenses in a different currency
  const foreignExpenses = expenses.filter((e) => e.currency !== group.currency);
  let convertedAmounts: Record<string, string> = {};

  if (foreignExpenses.length > 0) {
    try {
      const rates = await fetchRates(group.currency);
      convertedAmounts = Object.fromEntries(
        foreignExpenses.map((e) => {
          const converted = convert(e.amount, e.currency, group.currency, rates)
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
            .toString();
          return [e.id, converted];
        })
      );
    } catch {
      // If rate fetching fails, just show original amounts without conversion
    }
  }

  return <ExpenseList expenses={expenses} convertedAmounts={convertedAmounts} />;
}
