"use client";

import { Copy, History, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExpenseActionsMenuProps {
  size?: "sm" | "md";
  t: ReturnType<typeof useTranslations<"expenses">>;
  tc: ReturnType<typeof useTranslations<"common">>;
  onEdit: () => void;
  onDuplicate: () => void;
  onHistory: () => void;
  onDelete: () => void;
}

export function ExpenseActionsMenu({
  size = "md",
  t,
  tc,
  onEdit,
  onDuplicate,
  onHistory,
  onDelete,
}: ExpenseActionsMenuProps) {
  const btnCls = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const iconCls = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={`${btnCls} text-muted-foreground hover:text-foreground`}
            aria-label="Expense actions"
          />
        }
      >
        <MoreVertical className={iconCls} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          {t("actionEdit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy />
          {t("actionDuplicate")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onHistory}>
          <History />
          {t("actionHistory")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onClick={onDelete}>
          <Trash2 />
          {tc("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
