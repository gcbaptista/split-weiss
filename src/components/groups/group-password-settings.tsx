"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateGroupPassword } from "@/app/actions/group.actions";
import { Eye, EyeOff, Lock, LockOpen } from "lucide-react";

interface GroupPasswordSettingsProps {
  groupId: string;
  hasPassword: boolean;
}

export function GroupPasswordSettings({
  groupId,
  hasPassword: initialHasPassword,
}: GroupPasswordSettingsProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasPassword, setHasPassword] = useState(initialHasPassword);

  async function handleSetPassword() {
    if (!password.trim() || password.length < 4) {
      toast.error("Use at least 4 characters");
      return;
    }

    setSaving(true);
    const result = await updateGroupPassword(groupId, { password });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Password saved");
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
      toast.success("Password removed");
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
            <Lock className="h-4 w-4 text-green-600" />
            <span className="font-medium">Password required</span>
          </>
        ) : (
          <>
            <LockOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">No password</span>
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="group-password">
          {hasPassword ? "Change password" : "Add password"}
        </Label>
        <div className="relative">
          <Input
            id="group-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={hasPassword ? "New password" : "Password"}
            autoComplete="new-password"
            maxLength={100}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {hasPassword
            ? "Changing it clears saved access on other devices."
            : "Anyone with the password can open this group."}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSetPassword}
          disabled={!password.trim() || password.length < 4 || saving}
          size="sm"
        >
          {saving ? "Saving..." : hasPassword ? "Save password" : "Add password"}
        </Button>

        {hasPassword && (
          <Button
            onClick={handleRemovePassword}
            disabled={saving}
            variant="outline"
            size="sm"
          >
            Remove password
          </Button>
        )}
      </div>
    </div>
  );
}

