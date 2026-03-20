import { getGroupRequestAccess } from "@/lib/group-access";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { GroupTabs } from "@/components/groups/group-tabs";
import { MobileTabBar } from "@/components/groups/mobile-tab-bar";
import { RecentGroupTracker } from "@/components/groups/recent-group-tracker";
import { GroupUnlockPrompt } from "@/components/groups/group-unlock-prompt";
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
  const access = await getGroupRequestAccess(groupId);

  if (access.status === "not-found") notFound();
  if (access.status === "locked") return <GroupUnlockPrompt groupId={groupId} />;

  const group = access.group;
  const members = group.members.map((member) => member.user);
  const defaultPayerId = members[0]?.id;

  if (!defaultPayerId) notFound();

  return (
    <div>
      <RecentGroupTracker groupId={groupId} />

      <div className="sticky top-0 z-10 -mx-4 bg-background px-4 pb-0 pt-1 md:-mx-6 md:px-6">
        <Link
          href="/groups"
          className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground sm:hidden"
        >
          <ChevronLeft className="h-4 w-4" />
          Groups
        </Link>
        <div className="flex items-center justify-between gap-3 pb-4">
          <div className="min-w-0 flex items-center gap-3">
            <span className="shrink-0 text-2xl sm:text-3xl">{group.emoji ?? "💰"}</span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold sm:text-2xl">{group.name}</h1>
              <p className="text-sm text-muted-foreground">
                {group.currency} · {group.members.length} member
                {group.members.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="hidden shrink-0 sm:block">
            <AddExpenseDialog
              groupId={groupId}
              members={members}
              groupCurrency={group.currency}
              defaultPayerId={defaultPayerId}
            />
          </div>
        </div>
        <div className="hidden md:block">
          <GroupTabs groupId={groupId} />
        </div>
      </div>

      <div className="pt-4 pb-20 md:pb-4">{children}</div>

      <MobileTabBar groupId={groupId} />

      <MobileExpenseFAB
        groupId={groupId}
        members={members}
        groupCurrency={group.currency}
        defaultPayerId={defaultPayerId}
      />
    </div>
  );
}

