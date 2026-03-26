"use client";
import { Check, History, MoreVertical, Pencil, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getMemberAuditLog } from "@/app/actions/expense.actions";
import { addMember, removeMember, renameMember } from "@/app/actions/member.actions";
import { formatDateTime } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExpenseAuditLogEntry } from "@/types/audit";
import type { MemberSummary } from "@/types/database";

interface MemberListProps {
  members: MemberSummary[];
  groupId: string;
  currentMemberId?: string;
}

export function MemberList({ members, groupId, currentMemberId }: MemberListProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [auditMember, setAuditMember] = useState<MemberSummary | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleAdd() {
    setAdding(true);
    const result = await addMember({ groupId, name });
    setAdding(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("addedToGroup"));
    setName("");
  }

  async function handleRemove(memberId: string) {
    const result = await removeMember(groupId, memberId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("removedFromGroup"));
  }

  function startEditing(member: MemberSummary) {
    setEditingId(member.id);
    setEditName(member.name);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  async function handleRename(memberId: string) {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    const result = await renameMember(groupId, memberId, editName);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setEditingId(null);
    toast.success(t("nameUpdated"));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-4 rounded-lg border p-4">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback>
                {(editingId === m.id ? editName : m.name)[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              {editingId === m.id ? (
                <Input
                  ref={editInputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(m.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm font-medium truncate">
                  {m.name}
                  {currentMemberId === m.id && (
                    <span className="text-muted-foreground font-normal"> {t("youLabel")}</span>
                  )}
                </p>
              )}
            </div>
            {editingId === m.id ? (
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRename(m.id)}
                  disabled={!editName.trim()}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditingId(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Member actions"
                    />
                  }
                >
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => startEditing(m)}>
                    <Pencil />
                    {t("actionEdit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAuditMember(m)}>
                    <History />
                    {t("actionHistory")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onClick={() => handleRemove(m.id)}>
                    <Trash2 />
                    {tc("delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 pt-2">
        <Input
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={adding || !name.trim()}>
          {adding ? tc("adding") : tc("add")}
        </Button>
      </div>
      {auditMember && (
        <MemberAuditSheet
          groupId={groupId}
          member={auditMember}
          onOpenChange={(open) => {
            if (!open) setAuditMember(null);
          }}
        />
      )}
    </div>
  );
}

const ACTION_BADGE_CLASSNAME: Record<string, string> = {
  CREATED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  UPDATED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DELETED: "bg-destructive/10 text-destructive",
  REVERTED: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

function MemberAuditSheet({
  groupId,
  member,
  onOpenChange,
}: {
  groupId: string;
  member: MemberSummary;
  onOpenChange: (open: boolean) => void;
}) {
  const tc = useTranslations("common");
  const ta = useTranslations("audit");
  const [logs, setLogs] = useState<ExpenseAuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionLabels: Record<string, string> = {
    CREATED: ta("created"),
    UPDATED: ta("updated"),
    DELETED: ta("deleted"),
    REVERTED: ta("reverted"),
  };

  useEffect(() => {
    void getMemberAuditLog(groupId, member.id)
      .then((result) => {
        if (result.error) {
          setError(result.error);
          return;
        }
        setLogs(result.data ?? []);
      })
      .catch(() => setError(tc("failedToLoadHistory")));
  }, [groupId, member.id]);

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{tc("historyTitle", { title: member.name })}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4 space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!logs && !error && (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          )}
          {logs && logs.length === 0 && (
            <p className="text-sm text-muted-foreground">{tc("noHistoryFound")}</p>
          )}
          {logs?.map((entry) => {
            const label = actionLabels[entry.action] ?? ta("updated");
            const badgeClass =
              ACTION_BADGE_CLASSNAME[entry.action] ??
              "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
            const title = entry.expense?.title ?? ta("deletedExpense");
            return (
              <div key={entry.id} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate max-w-[180px]">{title}</span>
                    <Badge className={badgeClass}>{label}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                {entry.actor && (
                  <p className="text-xs text-muted-foreground">
                    {ta("byActor", { name: entry.actor.name })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
