"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateGroup } from "@/app/actions/group.actions";

const EMOJI_OPTIONS = [
  "💰", "🍕", "✈️", "🏠", "🎉", "🛒", "🍻", "🎬", "⚽", "🏖️",
  "🚗", "🎸", "🍜", "🏔️", "💊", "📚", "🎮", "🐾", "🌍", "💼",
];

interface GroupSettingsFormProps {
  groupId: string;
  initialName: string;
  initialEmoji: string | null;
}

export function GroupSettingsForm({
  groupId,
  initialName,
  initialEmoji,
}: GroupSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState<string | null>(initialEmoji);
  const [saving, setSaving] = useState(false);
  const isDirty = name !== initialName || emoji !== initialEmoji;

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const result = await updateGroup(groupId, { name: name.trim(), emoji });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Changes saved");
      router.refresh();
    }
  }

  async function handleRemoveEmoji() {
    setSaving(true);
    const result = await updateGroup(groupId, { emoji: null });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Emoji removed");
      setEmoji(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="group-name">Group name</Label>
        <Input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          maxLength={100}
          placeholder="Group name"
        />
      </div>

      <div className="space-y-2">
        <Label>Emoji</Label>
        <div className="flex flex-wrap gap-2">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-colors hover:bg-muted ${
                emoji === e
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border"
              }`}
              aria-label={`Set emoji to ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={!isDirty || saving || !name.trim()}
          size="sm"
        >
          {saving ? "Saving..." : "Save changes"}
        </Button>

        {emoji && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemoveEmoji}
            disabled={saving}
          >
            Remove emoji
          </Button>
        )}
      </div>
    </div>
  );
}
