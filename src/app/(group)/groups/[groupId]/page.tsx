import { getAuthorizedGroup } from "@/lib/group-access";
import { getGroupExpenses } from "@/app/actions/expense.actions";
import { notFound } from "next/navigation";
import { ExpenseList } from "@/components/expenses/expense-list";

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

  const defaultPayerId = group.members[0]?.userId;
  if (!defaultPayerId) notFound();

  return (
    <ExpenseList
      expenses={expenses}
      defaultPayerId={defaultPayerId}
      groupId={groupId}
      members={group.members.map((member) => member.user)}
      groupCurrency={group.currency}
    />
  );
}