import { notFound } from "next/navigation";

import { getGroupExpenses } from "@/app/actions/expense.actions";
import { ExpenseList } from "@/components/expenses/expense-list";
import { getAuthorizedGroup, getCurrentMemberId } from "@/lib/group-access";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupExpensesPage({ params }: PageProps) {
  const { groupId } = await params;
  const [group, expenses, currentMemberId] = await Promise.all([
    getAuthorizedGroup(groupId),
    getGroupExpenses(groupId),
    getCurrentMemberId(groupId),
  ]);

  if (!group) notFound();

  const defaultPayerId = group.members[0]?.id;
  if (!defaultPayerId) notFound();

  return (
    <ExpenseList
      expenses={expenses}
      defaultPayerId={defaultPayerId}
      groupId={groupId}
      members={group.members}
      groupCurrency={group.currency}
      currentMemberId={currentMemberId ?? undefined}
    />
  );
}
