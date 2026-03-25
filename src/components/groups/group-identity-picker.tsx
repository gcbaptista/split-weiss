"use client";

import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { addAndIdentifyAsMember, identifyAsMember } from "@/app/actions/group.actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { MemberSummary } from "@/types/database";

interface GroupIdentityPickerProps {
  groupId: string;
  members: MemberSummary[];
}

export function GroupIdentityPicker({ groupId, members }: GroupIdentityPickerProps) {
  const t = useTranslations("identity");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewMember, setShowNewMember] = useState(false);
  const [newName, setNewName] = useState("");

  async function handlePick(memberId: string) {
    setIsSubmitting(true);
    try {
      const result = await identifyAsMember(groupId, memberId);
      if (result.error) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      toast.error(tc("somethingWentWrong"));
      setIsSubmitting(false);
    }
  }

  async function handleAddNew() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      const result = await addAndIdentifyAsMember(groupId, trimmed);
      if (result.error) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      toast.error(tc("somethingWentWrong"));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("whoAreYou")}</CardTitle>
          <CardDescription>{t("pickName")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((m) => (
              <Button
                key={m.id}
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                disabled={isSubmitting}
                onClick={() => handlePick(m.id)}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback>{m.name[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{m.name}</span>
              </Button>
            ))}

            {showNewMember ? (
              <div className="flex gap-2 pt-1">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("yourNamePlaceholder")}
                  autoFocus
                  disabled={isSubmitting}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNew()}
                />
                <Button disabled={isSubmitting || !newName.trim()} onClick={handleAddNew}>
                  {tc("join")}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3 text-muted-foreground"
                onClick={() => setShowNewMember(true)}
              >
                <UserPlus className="h-5 w-5" />
                <span className="text-sm">{t("someoneNew")}</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
