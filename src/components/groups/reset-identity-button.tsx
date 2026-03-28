"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { resetIdentity } from "@/app/actions/group.actions";
import { Button } from "@/components/ui/button";

interface ResetIdentityButtonProps {
  groupId: string;
  currentMemberName?: string;
}

export function ResetIdentityButton({ groupId, currentMemberName }: ResetIdentityButtonProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    const result = await resetIdentity(groupId);
    if (result.error) {
      toast.error(result.error);
      setResetting(false);
    } else {
      toast.success(t("identityReset"));
      router.refresh();
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">
        {currentMemberName ? (
          <>{t("identifiedAs", { name: currentMemberName })}</>
        ) : (
          t("notIdentified")
        )}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={handleReset}
        disabled={resetting}
      >
        {resetting ? t("resetting") : t("switch")}
      </Button>
    </div>
  );
}
