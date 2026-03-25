import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { GroupCard } from "@/components/groups/group-card";
import { JoinGroupForm } from "@/components/groups/join-group-form";
import { QrScannerButton } from "@/components/groups/qr-scanner";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getRecentAccessibleGroups } from "@/lib/group-access";

export default async function GroupsPage() {
  const [groups, t] = await Promise.all([
    getRecentAccessibleGroups(),
    getTranslations("groups"),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">{t("subtitle")}</p>
        </div>
        <Button render={<Link href="/groups/new" />} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          {t("newGroup")}
        </Button>
      </div>
      <div className="mb-6 flex items-center gap-2">
        <div className="flex-1">
          <JoinGroupForm />
        </div>
        <QrScannerButton />
      </div>
      {groups.length === 0 ? (
        <EmptyState
          icon="👥"
          title={t("noGroups")}
          description={t("noGroupsDescription")}
          action={
            <Button render={<Link href="/groups/new" />}>{t("createFirstGroup")}</Button>
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
