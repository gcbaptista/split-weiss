import { auth } from "@/lib/auth";
import { getUserGroups } from "@/app/actions/group.actions";
import { GroupCard } from "@/components/groups/group-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function GroupsPage() {
  const [session, groups] = await Promise.all([auth(), getUserGroups()]);
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            Welcome back, {firstName}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Your groups</p>
        </div>
        <Button render={<Link href="/groups/new" />} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          New group
        </Button>
      </div>
      {groups.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No groups yet"
          description="Create a group to start splitting expenses with friends."
          action={
            <Button render={<Link href="/groups/new" />}>
              Create your first group
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}
