"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ExpenseWithSplitsClient, MemberSummary } from "@/types/database";

import { ExpenseForm } from "./expense-form";

interface AddExpenseDialogProps {
  groupId: string;
  members: MemberSummary[];
  groupCurrency: string;
  defaultPayerId: string;
  // Edit mode — when provided, renders no trigger button and is controlled externally
  expense?: ExpenseWithSplitsClient;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddExpenseDialog({
  groupId,
  members,
  groupCurrency,
  defaultPayerId,
  expense,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddExpenseDialogProps) {
  const t = useTranslations("expenses");
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setUncontrolledOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger render={<Button />}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addExpense")}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[95svh] overflow-y-auto p-4 sm:p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense ? t("editExpense") : t("addExpense")}</DialogTitle>
        </DialogHeader>
        <ExpenseForm
          groupId={groupId}
          members={members}
          groupCurrency={groupCurrency}
          defaultPayerId={defaultPayerId}
          onSuccess={() => setOpen(false)}
          expenseId={expense?.id}
          initialExpense={expense}
        />
      </DialogContent>
    </Dialog>
  );
}
