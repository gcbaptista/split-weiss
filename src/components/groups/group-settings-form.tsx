"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { updateGroup } from "@/app/actions/group.actions";
import { CurrencySelect } from "@/components/shared/currency-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMOJI_OPTIONS = [
  "💰",
  "🍕",
  "✈️",
  "🏠",
  "🎉",
  "🛒",
  "🍻",
  "🎬",
  "⚽",
  "🏖️",
  "🚗",
  "🎸",
  "🍜",
  "🏔️",
  "💊",
  "📚",
  "🎮",
  "🐾",
  "🌍",
  "💼",
];

interface GroupSettingsFormProps {
  groupId: string;
  initialName: string;
  initialEmoji: string | null;
  initialCurrency: string;
}

export function GroupSettingsForm({
  groupId,
  initialName,
  initialEmoji,
  initialCurrency,
}: GroupSettingsFormProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState<string | null>(initialEmoji);
  const [currency, setCurrency] = useState(initialCurrency);
  const [saving, setSaving] = useState(false);
  const isDirty = name !== initialName || emoji !== initialEmoji || currency !== initialCurrency;

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const result = await updateGroup(groupId, { name: name.trim(), emoji, currency });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t("changesSaved"));
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="group-name">{t("groupNameLabel")}</Label>
        <Input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          maxLength={100}
          placeholder={t("groupNamePlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t("baseCurrency")}</Label>
        <CurrencySelect value={currency} onChange={setCurrency} />
        <p className="text-xs text-muted-foreground">
          {t("baseCurrencyHint")}
        </p>
      </div>

      <div className="space-y-2">
        <Label>{t("emojiLabel")}</Label>
        <p className="text-xs text-muted-foreground">{t("emojiHint")}</p>
        <div className="flex flex-wrap gap-2">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(emoji === e ? null : e)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-colors hover:bg-muted ${
                emoji === e ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border"
              }`}
              aria-label={emoji === e ? `Remove emoji ${e}` : `Set emoji to ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={!isDirty || saving || !name.trim()} size="sm">
        {saving ? tc("saving") : t("saveChanges")}
      </Button>
    </div>
  );
}
