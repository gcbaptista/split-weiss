import { auth } from "@/lib/auth";
import { getGroup } from "@/app/actions/group.actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { GroupTabs } from "@/components/groups/group-tabs";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";

interface GroupLayoutProps {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}

export default async function GroupLayout({
  children,
  params,
}: GroupLayoutProps) {
  const { groupId } = await params;
  const [group, session] = await Promise.all([getGroup(groupId), auth()]);
  if (!group || !session?.user?.id) notFound();

  const members = group.members.map((m) => m.user);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/groups"
          className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground sm:hidden"
        >
          <ChevronLeft className="h-4 w-4" />
          Groups
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl">{group.emoji ?? "💰"}</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{group.name}</h1>
              <p className="text-sm text-muted-foreground">
                {group.currency} · {group.members.length} member
                {group.members.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <AddExpenseDialog
            groupId={groupId}
            members={members}
            groupCurrency={group.currency}
            currentUserId={session.user.id}
          />
        </div>
      </div>
      <GroupTabs groupId={groupId} />
      {children}
    </div>
  );
}
