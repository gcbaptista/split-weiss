"use client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addMember, removeMember } from "@/app/actions/member.actions";
import { toast } from "sonner";
import { useState } from "react";
import type { GroupMember, User } from "@/types/database";

interface MemberListProps {
  members: (GroupMember & { user: User })[];
  groupId: string;
  currentUserId: string;
  isAdmin: boolean;
}

export function MemberList({
  members,
  groupId,
  currentUserId,
  isAdmin,
}: MemberListProps) {
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    setAdding(true);
    const result = await addMember({ groupId, email });
    setAdding(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Member added!");
    setEmail("");
  }

  async function handleRemove(userId: string) {
    const result = await removeMember(groupId, userId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Member removed");
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback>
                  {m.user.name?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{m.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={m.role === "ADMIN" ? "default" : "secondary"}>
                {m.role}
              </Badge>
              {isAdmin && m.userId !== currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(m.userId)}
                >
                  Remove
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {isAdmin && (
        <div className="flex gap-2">
          <Input
            placeholder="member@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={adding || !email}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
