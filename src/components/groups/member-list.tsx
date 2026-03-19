"use client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addMember, removeMember } from "@/app/actions/member.actions";
import { toast } from "sonner";
import { useState } from "react";
import type { GroupMember, User } from "@/types/database";

interface MemberListProps {
  members: (GroupMember & { user: User })[];
  groupId: string;
}

export function MemberList({
  members,
  groupId,
}: MemberListProps) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    setAdding(true);
    const result = await addMember({ groupId, name });
    setAdding(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Added to group");
    setName("");
  }

  async function handleRemove(userId: string) {
    const result = await removeMember(groupId, userId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Removed from group");
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex items-center gap-4 rounded-lg border p-4"
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback>
                {m.user.name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{m.user.name}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemove(m.userId)}
              className="shrink-0"
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 pt-2">
        <Input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={adding || !name.trim()}>
          {adding ? "Adding..." : "Add"}
        </Button>
      </div>
    </div>
  );
}
