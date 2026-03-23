import { Plus } from "lucide-react";
import Link from "next/link";

import { GroupCard } from "@/components/groups/group-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getRecentAccessibleGroups } from "@/lib/group-access";

export default async function GroupsPage() {
  const groups = await getRecentAccessibleGroups();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Groups</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Recently opened on this device
          </p>
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
          description="Create a group or open a group link to see it here."
          action={<Button render={<Link href="/groups/new" />}>Create your first group</Button>}
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
