import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export async function GroupNotFoundState() {
  const t = await getTranslations("notFound");

  return (
    <EmptyState
      icon="🔎"
      title={t("title")}
      description={t("description")}
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button render={<Link href="/groups" />} variant="outline">
            {t("backToGroups")}
          </Button>
          <Button render={<Link href="/groups/new" />}>{t("createNewGroup")}</Button>
        </div>
      }
    />
  );
}
