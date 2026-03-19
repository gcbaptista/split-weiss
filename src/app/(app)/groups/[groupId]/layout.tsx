import { auth } from "@/lib/auth";
import { getGroup } from "@/app/actions/group.actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { GroupTabs } from "@/components/groups/group-tabs";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { MobileExpenseFAB } from "@/components/expenses/mobile-expense-fab";

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
      {/* Sticky header — sticks to top of the scrollable main container */}
      <div className="sticky top-0 z-10 -mx-4 bg-background px-4 pb-0 pt-1 md:-mx-6 md:px-6">
        <Link
          href="/groups"
          className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground sm:hidden"
        >
          <ChevronLeft className="h-4 w-4" />
          Groups
        </Link>
        <div className="flex items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl sm:text-3xl shrink-0">{group.emoji ?? "💰"}</span>
            <div className="min-w-0">
              <h1 className="truncate text-xl sm:text-2xl font-bold">{group.name}</h1>
              <p className="text-sm text-muted-foreground">
                {group.currency} · {group.members.length} member
                {group.members.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {/* Desktop add expense button — hidden on mobile (use FAB instead) */}
          <div className="hidden sm:block shrink-0">
            <AddExpenseDialog
              groupId={groupId}
              members={members}
              groupCurrency={group.currency}
              currentUserId={session.user.id}
            />
          </div>
        </div>
        <GroupTabs groupId={groupId} />
      </div>

      <div className="pt-4">{children}</div>

      {/* Mobile FAB — bottom-right floating button, hidden on desktop */}
      <MobileExpenseFAB
        groupId={groupId}
        members={members}
        groupCurrency={group.currency}
        currentUserId={session.user.id}
      />
    </div>
  );
}
