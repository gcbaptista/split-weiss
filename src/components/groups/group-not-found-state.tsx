import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export function GroupNotFoundState() {
  return (
    <EmptyState
      icon="🔎"
      title="Group not found"
      description="This group may have been deleted, or the link may be incorrect."
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button render={<Link href="/groups" />} variant="outline">
            Back to groups
          </Button>
          <Button render={<Link href="/groups/new" />}>Create a new group</Button>
        </div>
      }
    />
  );
}
