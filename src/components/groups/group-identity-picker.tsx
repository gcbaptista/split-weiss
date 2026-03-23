"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { identifyAsMember, addAndIdentifyAsMember } from "@/app/actions/group.actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus } from "lucide-react";
import type { MemberSummary } from "@/types/database";

interface GroupIdentityPickerProps {
  groupId: string;
  members: MemberSummary[];
}

export function GroupIdentityPicker({ groupId, members }: GroupIdentityPickerProps) {
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
      toast.error("Something went wrong");
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
      toast.error("Something went wrong");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Who are you?</CardTitle>
          <CardDescription>
            Pick your name so we can highlight your balances.
          </CardDescription>
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
                  placeholder="Your name"
                  autoFocus
                  disabled={isSubmitting}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNew()}
                />
                <Button
                  disabled={isSubmitting || !newName.trim()}
                  onClick={handleAddNew}
                >
                  Join
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3 text-muted-foreground"
                onClick={() => setShowNewMember(true)}
              >
                <UserPlus className="h-5 w-5" />
                <span className="text-sm">I&apos;m someone new</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

