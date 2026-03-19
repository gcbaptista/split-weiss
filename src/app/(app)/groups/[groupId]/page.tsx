import { getGroup } from "@/app/actions/group.actions";
import { getGroupExpenses } from "@/app/actions/expense.actions";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ExpenseList } from "@/components/expenses/expense-list";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupExpensesPage({ params }: PageProps) {
  const { groupId } = await params;
  const [session, group, expenses] = await Promise.all([
    auth(),
    getGroup(groupId),
    getGroupExpenses(groupId),
  ]);
  if (!session?.user?.id || !group) notFound();

  const currentMember = group.members.find(m => m.user.id === session.user?.id);
  const isAdmin = currentMember?.role === "ADMIN";

  return (
    <ExpenseList
      expenses={expenses}
      currentUserId={session.user.id}
      groupId={groupId}
      members={group.members.map((m) => m.user)}
      groupCurrency={group.currency}
      isAdmin={isAdmin}
    />
  );
}
