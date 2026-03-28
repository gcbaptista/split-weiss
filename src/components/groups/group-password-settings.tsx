"use client";

import { Eye, EyeOff, Lock, LockOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { updateGroupPassword } from "@/app/actions/group.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GroupPasswordSettingsProps {
  groupId: string;
  hasPassword: boolean;
}

export function GroupPasswordSettings({
  groupId,
  hasPassword: initialHasPassword,
}: GroupPasswordSettingsProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasPassword, setHasPassword] = useState(initialHasPassword);

  async function handleSetPassword() {
    if (!password.trim() || password.length < 4) {
      toast.error(t("minPasswordLength"));
      return;
    }

    setSaving(true);
    const result = await updateGroupPassword(groupId, { password });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t("passwordSaved"));
      setHasPassword(true);
      setPassword("");
      router.refresh();
    }
  }

  async function handleRemovePassword() {
    setSaving(true);
    const result = await updateGroupPassword(groupId, { password: null });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t("passwordRemoved"));
      setHasPassword(false);
      setPassword("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        {hasPassword ? (
          <>
            <Lock className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="font-medium">{t("passwordRequired")}</span>
          </>
        ) : (
          <>
            <LockOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{t("noPassword")}</span>
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="group-password">
          {hasPassword ? t("changePassword") : t("addPassword")}
        </Label>
        <div className="relative">
          <Input
            id="group-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={hasPassword ? t("newPasswordPlaceholder") : t("passwordPlaceholder")}
            autoComplete="new-password"
            maxLength={100}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {hasPassword ? t("changePasswordHint") : t("addPasswordHint")}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSetPassword}
          disabled={!password.trim() || password.length < 4 || saving}
          size="sm"
        >
          {saving ? tc("saving") : hasPassword ? t("savePassword") : t("addPassword")}
        </Button>

        {hasPassword && (
          <Button onClick={handleRemovePassword} disabled={saving} variant="outline" size="sm">
            {t("removePassword")}
          </Button>
        )}
      </div>
    </div>
  );
}
