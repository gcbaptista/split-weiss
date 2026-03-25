import { getTranslations } from "next-intl/server";

import { GroupForm } from "@/components/groups/group-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewGroupPage() {
  const t = await getTranslations("groupForm");

  return (
    <div className="mx-auto w-full max-w-lg">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("createTitle")}</CardTitle>
          <CardDescription>{t("createDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GroupForm />
        </CardContent>
      </Card>
    </div>
  );
}
